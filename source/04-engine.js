/* ==========================================================================
   04 - ASSESSMENT / GRADING / RESULT CALCULATION ENGINE
   Handles: configurable assessment components & weights, configurable
   grading bands, blank vs absent vs excused vs zero, weighted totals,
   class averages and configurable ranking (competition/dense/ordinal).
   ========================================================================== */

var SCORE_STATES = { NONE:null, ABSENT:"ABSENT", EXCUSED:"EXCUSED" };

function getAssessmentScheme(subject, classArm){
  if (subject && subject.assessmentSchemeId){
    var forced = byId(state.assessmentSchemes, subject.assessmentSchemeId);
    if (forced) return forced;
  }
  var candidates = state.assessmentSchemes.filter(function(sc){
    return sc.sectionIds && sc.sectionIds.indexOf(classArm.sectionId) > -1;
  });
  return candidates[0] || state.assessmentSchemes[0];
}

function getGradingScheme(subject, classArm){
  if (subject && subject.gradingSchemeId){
    var forced = byId(state.gradingSchemes, subject.gradingSchemeId);
    if (forced) return forced;
  }
  var candidates = state.gradingSchemes.filter(function(sc){
    return sc.sectionIds && sc.sectionIds.indexOf(classArm.sectionId) > -1;
  });
  return candidates[0] || state.gradingSchemes[0];
}

function gradeFor(total, gradingScheme){
  // Bands are whole-number ranges (e.g. 70-74, 75-100) but totals can be
  // fractional (e.g. 74.5). The old exact-range test left those totals in
  // the "gap" between two bands and gave them no grade at all. Taking the
  // highest band whose minimum the total reaches closes every gap and gives
  // exactly the same answer for whole-number totals.
  if (!gradingScheme || !gradingScheme.bands || typeof total !== "number" || isNaN(total)) return { grade:"-", remark:"", point:null };
  var sorted = gradingScheme.bands.slice().sort(function(a,b){ return b.min - a.min; });
  for (var i=0;i<sorted.length;i++){
    if (total >= sorted[i].min) return sorted[i];
  }
  return { grade:"-", remark:"", point:null };
}

function scoreKey(studentId, subjectId, classArmId, sessionId, termId){
  return [studentId, subjectId, classArmId, sessionId, termId].join("::");
}

function getScoreRecord(studentId, subjectId, classArmId, sessionId, termId){
  return state.scores.filter(function(s){
    return s.studentId===studentId && s.subjectId===subjectId && s.classArmId===classArmId &&
           s.sessionId===sessionId && s.termId===termId;
  })[0] || null;
}

function ensureScoreRecord(studentId, subjectId, classArmId, sessionId, termId){
  var rec = getScoreRecord(studentId, subjectId, classArmId, sessionId, termId);
  if (rec) return rec;
  rec = { id: uid("score"), studentId:studentId, subjectId:subjectId, classArmId:classArmId,
          sessionId:sessionId, termId:termId, components:{}, status:"DRAFT", updatedAt:Date.now() };
  state.scores.push(rec);
  return rec;
}

/* Computes the weighted total for one student's subject score record.
   Returns isComplete=false if any active component is blank (null/undefined) -
   blank never silently becomes 0. ABSENT/EXCUSED count as "complete" (handled)
   but contribute 0 to the total and are flagged separately. */
function computeSubjectTotal(rec, scheme){
  var total = 0, missing = [], hasAbsent = false, hasExcused = false, anyEntered = false;
  if (rec && rec.attendanceState==="ABSENT"){ return { total:0, isComplete:true, missingComponents:[], hasAbsent:true, hasExcused:false, anyEntered:false }; }
  if (rec && rec.attendanceState==="EXCUSED"){ return { total:0, isComplete:true, missingComponents:[], hasAbsent:false, hasExcused:true, anyEntered:false }; }
  scheme.components.filter(function(c){return c.active;}).forEach(function(c){
    var v = rec ? rec.components[c.id] : undefined;
    if (v === SCORE_STATES.ABSENT){ hasAbsent = true; return; }
    if (v === SCORE_STATES.EXCUSED){ hasExcused = true; return; }
    if (v === undefined || v === null || v === ""){ missing.push(c.name); return; }
    var num = Number(v);
    if (isNaN(num)) { missing.push(c.name); return; }
    anyEntered = true;
    var weighted = (num / c.maxScore) * c.weight;
    total += weighted;
  });
  total = Math.round(total * 100) / 100;
  return {
    total: total,
    isComplete: missing.length === 0,
    missingComponents: missing,
    hasAbsent: hasAbsent,
    hasExcused: hasExcused,
    anyEntered: anyEntered
  };
}

/* All students currently enrolled in a class-arm (active status only by default) */
function studentsInClassArm(classArmId, includeInactive){
  return state.students.filter(function(s){
    return s.classArmId === classArmId && (includeInactive || s.status==="Active" || s.status==="Repeated");
  });
}

/* ADMIN SWITCH-OFF: a subject can be switched off for one class (for one term,
   or every term of a session) when that class simply does not take it - e.g.
   Hausa for two of the Primary classes. subject.notTaken is a list of
   {classArmId, termId}. Nothing is deleted: scores already entered stay
   stored and return if the switch is removed. termId defaults to the
   currently selected term. */
function subjectOffForClass(subject, classArmId, termId){
  if (!subject || !subject.notTaken || !subject.notTaken.length) return false;
  var t = termId || state.currentTermId;
  return subject.notTaken.some(function(x){ return x.classArmId === classArmId && x.termId === t; });
}

/* subjects applicable to a class-arm in general (used for class-level lists
   like "which subjects does this class have" - not tied to one student) */
function subjectsForClassArm(classArm, termId){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
    if (subjectOffForClass(su, classArm.id, termId)) return false;
    var sectionOk = su.sectionIds.indexOf(classArm.sectionId) > -1;
    if (!sectionOk) return false;
    if (su.departmentIds && su.departmentIds.length){
      return classArm.departmentId && su.departmentIds.indexOf(classArm.departmentId) > -1;
    }
    return true;
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* Whether a specific student takes a specific subject. Subjects with no
   department restriction apply to everyone. Department-restricted subjects
   use the student's own explicit subject selections if the Form Teacher has
   set any (student.subjectIds); otherwise they fall back to a simple
   department match, so students who've only had a Department set (not yet
   fine-tuned subject-by-subject) still work sensibly. */
function studentTakesSubject(student, subject){
  // Religion group: Islamic Studies and CRK. A subject can be limited to one
  // group; a student belongs to the CRK group only if marked CRK, otherwise
  // they are in the Islamic Studies group (the school default).
  if (subject.religiousTrack){
    var track = student.religiousTrack || "ISLAMIC";
    if (track !== subject.religiousTrack) return false;
  }
  if (!subject.departmentIds || !subject.departmentIds.length) return true;
  if (student.subjectIds !== undefined && student.subjectIds !== null){
    return student.subjectIds.indexOf(subject.id) > -1;
  }
  return !!(student.departmentId && subject.departmentIds.indexOf(student.departmentId) > -1);
}

/* Subjects a SPECIFIC student takes. This is the one that matters for a
   student's own average/report card/score entry - it uses the STUDENT's own
   subject selections (falling back to department), not the class's. This is
   what makes mixed classes (e.g. one SS1 class with Science/Arts/Commercial
   students together) work correctly: a subject with no department
   restriction applies to everyone (general/compulsory subjects); a subject
   restricted to one or more departments only applies to students who
   personally take it, regardless of what department (if any) the class
   itself is tagged with. */
function subjectsForStudent(student, classArm, termId){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
    if (subjectOffForClass(su, classArm.id, termId)) return false;
    if (su.sectionIds.indexOf(classArm.sectionId) === -1) return false;
    return studentTakesSubject(student, su);
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* Which students in a class-arm actually take a given subject. */
function studentsForSubject(subject, classArmId, termId){
  if (subjectOffForClass(subject, classArmId, termId)) return [];
  var all = studentsInClassArm(classArmId);
  if ((!subject.departmentIds || !subject.departmentIds.length) && !subject.religiousTrack) return all;
  return all.filter(function(stu){ return studentTakesSubject(stu, subject); });
}

/* Builds a full results table for one class-arm/subject/session/term:
   rows = [{student, rec, scheme, total, grade, ...}], with class average
   and position computed with the configured tie method. */
function computeSubjectClassResults(classArmId, subjectId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var scheme = getAssessmentScheme(subject, classArm);
  var grading = getGradingScheme(subject, classArm);
  var students = studentsForSubject(subject, classArmId, termId);

  var rows = students.map(function(stu){
    var rec = getScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : { grade:"-", remark:"", point:null };
    return { student: stu, rec: rec, calc: calc, grade: band.grade, remark: band.remark };
  });

  var completeRows = rows.filter(function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused; });
  var classAverage = completeRows.length
    ? Math.round((completeRows.reduce(function(a,r){return a+r.calc.total;},0) / completeRows.length) * 100) / 100
    : null;

  assignPositions(rows, function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused ? r.calc.total : null; });

  return { classArm: classArm, subject: subject, scheme: scheme, grading: grading, rows: rows, classAverage: classAverage };
}

/* Generic position assignment supporting competition/dense/ordinal tie methods.
   valueFn(row) should return a number to rank by, or null to exclude from ranking. */
function assignPositions(rows, valueFn){
  var method = (state.rankingConfig && state.rankingConfig.tieMethod) || "competition";
  var ranked = rows.map(function(r, idx){ return { r:r, v: valueFn(r), idx: idx }; })
                   .filter(function(x){ return x.v !== null && x.v !== undefined; })
                   .sort(function(a,b){ return b.v - a.v; });

  var lastValue = null, lastPosition = 0;
  ranked.forEach(function(entry, i){
    var position;
    if (method === "ordinal"){
      position = i + 1;
    } else if (method === "dense"){
      if (entry.v !== lastValue){ lastPosition += 1; }
      position = lastPosition;
    } else { // competition (1,2,2,4)
      if (entry.v !== lastValue){ lastPosition = i + 1; }
      position = lastPosition;
    }
    lastValue = entry.v;
    entry.r.position = position;
  });
  rows.forEach(function(r){ if (r.position === undefined) r.position = null; });
}

/* Full student overall summary across all applicable subjects for a term,
   used on report cards and the Form Teacher review screen. */
function computeStudentOverall(studentId, classArmId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var student = byId(state.students, studentId);
  var applicable = subjectsForStudent(student, classArm, termId);
  var subjectRows = applicable.map(function(subject){
    var scheme = getAssessmentScheme(subject, classArm);
    var grading = getGradingScheme(subject, classArm);
    var rec = getScoreRecord(studentId, subject.id, classArmId, sessionId, termId);
    var calc = computeSubjectTotal(rec, scheme);
    var band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading) : { grade:"-", remark:"", point:null };
    return { subject: subject, calc: calc, grade: band.grade, remark: band.remark };
  });

  var forAverage = subjectRows.filter(function(r){ return r.subject.includeInAverage; });
  var complete = forAverage.filter(function(r){ return r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused; });
  var grandTotal = complete.reduce(function(a,r){ return a + r.calc.total; }, 0);
  var average = complete.length ? Math.round((grandTotal / complete.length) * 100) / 100 : null;
  var allComplete = forAverage.length > 0 && complete.length === forAverage.length;

  return { subjectRows: subjectRows, grandTotal: Math.round(grandTotal*100)/100, average: average, allComplete: allComplete,
           totalSubjects: forAverage.length, completedSubjects: complete.length };
}

/* True when EVERY student who takes this subject in this class has all score
   parts entered (or is marked Absent/Excused). Used so dashboards count a
   subject as done only when it really is, not merely because a teacher
   pressed Submit. */
function isSubjectResultComplete(classArmId, subjectId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  if (!classArm || !subject) return false;
  var scheme = getAssessmentScheme(subject, classArm);
  var eligible = studentsForSubject(subject, classArmId, termId);
  if (!eligible.length) return false;
  return eligible.every(function(stu){
    var rec = getScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
    return computeSubjectTotal(rec, scheme).isComplete;
  });
}

/* HOW MUCH OF THE MARKS ARE RECORDED for one subject in one class.
   A score column (CA1, CA2, Exam...) counts as recorded only when EVERY
   student who takes the subject has a value in it (or is marked
   Absent/Excused). The recorded percentage is the weight of those columns
   out of the whole scheme, so with CA1 = 20 of 100, a teacher who has
   finished CA1 only has recorded 20%, with 80% remaining. */
function computeSubjectProgress(classArmId, subjectId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subject = byId(state.subjects, subjectId);
  var empty = { components:[], students:0, totalWeight:0, recordedWeight:0, percentRecorded:0, percentRemaining:100 };
  if (!classArm || !subject) return empty;
  var scheme = getAssessmentScheme(subject, classArm);
  var students = studentsForSubject(subject, classArmId, termId);
  var comps = scheme.components.filter(function(c){return c.active;}).sort(function(a,b){return a.order-b.order;});
  var totalWeight = comps.reduce(function(a,c){return a + c.weight;}, 0);
  var parts = comps.map(function(c){
    var done = students.filter(function(stu){
      var rec = getScoreRecord(stu.id, subjectId, classArmId, sessionId, termId);
      if (!rec) return false;
      if (rec.attendanceState === "ABSENT" || rec.attendanceState === "EXCUSED") return true;
      var v = rec.components[c.id];
      if (v === SCORE_STATES.ABSENT || v === SCORE_STATES.EXCUSED) return true;
      if (v === undefined || v === null || v === "") return false;
      return !isNaN(Number(v));
    }).length;
    return { id:c.id, name:c.name, weight:c.weight, done:done, total:students.length,
             complete: students.length > 0 && done === students.length };
  });
  var recordedWeight = parts.filter(function(p){return p.complete;}).reduce(function(a,p){return a + p.weight;}, 0);
  var pct = totalWeight > 0 ? Math.round((recordedWeight / totalWeight) * 100) : 0;
  return { components: parts, students: students.length, totalWeight: totalWeight, recordedWeight: recordedWeight,
           percentRecorded: pct, percentRemaining: 100 - pct };
}

/* What the Form Teacher should see for a subject: once the subject is fully
   submitted the live figure (100%); before that, the progress the subject
   teacher last SUBMITTED (not whatever they have typed since). */
function submittedProgressFor(status, progress, snapshot){
  var full = ["SUBMITTED","APPROVED","ADMIN_REVIEW","PUBLISHED","LOCKED"].indexOf(status) > -1;
  if (full) return { percent: progress.percentRecorded, remaining: progress.percentRemaining, names: progress.components.filter(function(p){return p.complete;}).map(function(p){return p.name;}), submitted: true };
  if (snapshot) return { percent: snapshot.percent, remaining: 100 - snapshot.percent, names: snapshot.names || [], submitted: true, at: snapshot.at };
  return { percent: 0, remaining: 100, names: [], submitted: false };
}

/* Whole-class overview used by Form Teacher review + Admin approval screens */
function computeClassOverview(classArmId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var students = studentsInClassArm(classArmId);
  // A religion group (CRK / Islamic Studies) is listed only where some student takes it.
  var subjects = subjectsForClassArm(classArm, termId).filter(function(su){
    return !su.religiousTrack || students.some(function(stu){ return studentTakesSubject(stu, su); });
  });

  var subjectStatuses = subjects.map(function(su){
    var key = [classArmId, su.id, sessionId, termId].join("::");
    var teacherAssign = state.teacherAssignments.filter(function(a){
      return a.subjectId===su.id && a.classArmId===classArmId && a.active && a.sessionId===sessionId && a.termId===termId;
    })[0];
    var status = state.classSubjectStatus[key] || (teacherAssign ? "PENDING" : "UNASSIGNED");
    var eligible = studentsForSubject(su, classArmId, termId);
    var entered = eligible.filter(function(stu){
      var rec = getScoreRecord(stu.id, su.id, classArmId, sessionId, termId);
      return rec && (Object.keys(rec.components).length > 0);
    }).length;
    var progress = computeSubjectProgress(classArmId, su.id, sessionId, termId);
    var snapshot = (state.subjectProgress || {})[key] || null;
    return { subject: su, status: status, teacherId: teacherAssign ? teacherAssign.teacherId : null,
              entered: entered, totalStudents: eligible.length,
              complete: isSubjectResultComplete(classArmId, su.id, sessionId, termId),
              progress: progress, submitted: submittedProgressFor(status, progress, snapshot) };
  });

  var overallRows = students.map(function(stu){
    var overall = computeStudentOverall(stu.id, classArmId, sessionId, termId);
    return { student: stu, overall: overall };
  });
  assignPositions(overallRows, function(r){ return r.overall.allComplete ? r.overall.average : null; });

  var classAverage = null;
  var completeOverall = overallRows.filter(function(r){ return r.overall.allComplete; });
  if (completeOverall.length){
    classAverage = Math.round((completeOverall.reduce(function(a,r){return a+r.overall.average;},0)/completeOverall.length)*100)/100;
  }

  return { classArm: classArm, subjects: subjects, subjectStatuses: subjectStatuses, students: overallRows, classAverage: classAverage };
}

/* One subject's class-average + this specific student's position within it
   (used on the report card's per-subject Class Average / Position columns) */
function getSubjectStatForStudent(classArmId, subjectId, sessionId, termId, studentId){
  var res = computeSubjectClassResults(classArmId, subjectId, sessionId, termId);
  var row = res.rows.filter(function(r){ return r.student.id === studentId; })[0];
  return { classAverage: res.classAverage, position: row ? row.position : null, totalStudents: res.rows.length };
}

function calcAge(dobStr){
  if (!dobStr) return "";
  var dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return "";
  var diffMs = Date.now() - dob.getTime();
  var age = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
  return age >= 0 && age < 100 ? age : "";
}
