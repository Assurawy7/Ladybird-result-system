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
  if (!gradingScheme) return { grade:"-", remark:"", point:null };
  for (var i=0;i<gradingScheme.bands.length;i++){
    var b = gradingScheme.bands[i];
    if (total >= b.min && total <= b.max) return b;
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

/* subjects applicable to a class-arm in general (used for class-level lists
   like "which subjects does this class have" - not tied to one student) */
function subjectsForClassArm(classArm){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
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
function subjectsForStudent(student, classArm){
  return state.subjects.filter(function(su){
    if (!su.active) return false;
    if (su.sectionIds.indexOf(classArm.sectionId) === -1) return false;
    return studentTakesSubject(student, su);
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* Which students in a class-arm actually take a given subject. */
function studentsForSubject(subject, classArmId){
  var all = studentsInClassArm(classArmId);
  if (!subject.departmentIds || !subject.departmentIds.length) return all;
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
  var students = studentsForSubject(subject, classArmId);

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
  var applicable = subjectsForStudent(student, classArm);
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

/* Whole-class overview used by Form Teacher review + Admin approval screens */
function computeClassOverview(classArmId, sessionId, termId){
  var classArm = byId(state.classArms, classArmId);
  var subjects = subjectsForClassArm(classArm);
  var students = studentsInClassArm(classArmId);

  var subjectStatuses = subjects.map(function(su){
    var key = [classArmId, su.id, sessionId, termId].join("::");
    var teacherAssign = state.teacherAssignments.filter(function(a){
      return a.subjectId===su.id && a.classArmId===classArmId && a.active && a.sessionId===sessionId && a.termId===termId;
    })[0];
    var status = state.classSubjectStatus[key] || (teacherAssign ? "PENDING" : "UNASSIGNED");
    var eligible = studentsForSubject(su, classArmId);
    var entered = eligible.filter(function(stu){
      var rec = getScoreRecord(stu.id, su.id, classArmId, sessionId, termId);
      return rec && (Object.keys(rec.components).length > 0);
    }).length;
    return { subject: su, status: status, teacherId: teacherAssign ? teacherAssign.teacherId : null,
              entered: entered, totalStudents: eligible.length };
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
