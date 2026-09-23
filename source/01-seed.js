/* ==========================================================================
   LADYBIRD WHOLE-SCHOOL ACADEMIC RESULT MANAGEMENT SYSTEM
   01 - SEED DATA
   All of this is DEMO data. It is clearly marked with isDemo:true where
   relevant and can be wiped from Settings > Backup > "Clear demo data".
   ========================================================================== */

var STORAGE_KEY = "ladybird_whole_school_v1";


function seedState(){
  var sectionNursery = uid("sec"), sectionPrimary = uid("sec"), sectionJSS = uid("sec"), sectionSS = uid("sec");

  var deptScience = uid("dept"), deptArts = uid("dept"), deptCommercial = uid("dept");

  // Class-Arms: a "ClassArm" is a concrete teachable group, e.g. "JSS1A" or "SS1 Science A"
  function ca(section, name, dept){ return { id: uid("ca"), sectionId: section, name: name, departmentId: dept || null, active: true }; }

  var classArms = [
    ca(sectionNursery, "Nursery 1"),
    ca(sectionNursery, "Nursery 2"),
    ca(sectionPrimary, "Primary 1A"),
    ca(sectionPrimary, "Primary 1B"),
    ca(sectionPrimary, "Primary 2A"),
    ca(sectionJSS, "JSS1A"),
    ca(sectionJSS, "JSS1B"),
    ca(sectionJSS, "JSS2A"),
    ca(sectionSS, "SS1 Science A", deptScience),
    ca(sectionSS, "SS1 Arts A", deptArts),
    ca(sectionSS, "SS2 Commercial A", deptCommercial)
  ];

  var sessionId = uid("sess");
  var term1 = uid("term"), term2 = uid("term"), term3 = uid("term");

  var schemeSecondary = uid("ascheme");
  var schemePrimary = uid("ascheme");
  var schemeNursery = uid("ascheme");

  var gradingSecondary = uid("gscheme");
  var gradingNursery = uid("gscheme");

  function findCA(name){ for (var i=0;i<classArms.length;i++){ if (classArms[i].name===name) return classArms[i]; } return null; }

  var subjects = [
    { id: uid("subj"), name:"English Language", code:"ENG", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:1, active:true },
    { id: uid("subj"), name:"Mathematics", code:"MTH", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:2, active:true },
    { id: uid("subj"), name:"Biology", code:"BIO", sectionIds:[sectionSS], departmentIds:[deptScience], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:3, active:true },
    { id: uid("subj"), name:"Physics", code:"PHY", sectionIds:[sectionSS], departmentIds:[deptScience], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:4, active:true },
    { id: uid("subj"), name:"Commerce", code:"COM", sectionIds:[sectionSS], departmentIds:[deptCommercial], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:5, active:true },
    { id: uid("subj"), name:"Literature-in-English", code:"LIT", sectionIds:[sectionSS], departmentIds:[deptArts], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:6, active:true },
    { id: uid("subj"), name:"Islamic Studies", code:"ISL", sectionIds:[sectionJSS,sectionSS], departmentIds:[], core:false, includeInAverage:true, includeInRanking:true, passMark:40, order:7, active:true },
    { id: uid("subj"), name:"Basic Science", code:"BSC", sectionIds:[sectionJSS], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:40, order:8, active:true },
    { id: uid("subj"), name:"Number Work", code:"NUM", sectionIds:[sectionNursery,sectionPrimary], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:0, order:1, active:true },
    { id: uid("subj"), name:"Letter Work", code:"LET", sectionIds:[sectionNursery,sectionPrimary], departmentIds:[], core:true, includeInAverage:true, includeInRanking:true, passMark:0, order:2, active:true }
  ];

  var teacherA = uid("user"), teacherB = uid("user"), formTeacherC = uid("user"),
      admin1 = uid("user"), principal1 = uid("user"), superAdmin1 = uid("user"), supervisor1 = uid("user");

  var users = [
    { id: superAdmin1, username:"superadmin", password:"demo123", name:"Super Admin", role:"SUPER_ADMIN", photo:"", signature:"", active:true, isDemo:true },
    { id: admin1, username:"admin", password:"demo123", name:"Mrs. Grace Okoro", role:"ADMIN", photo:"", signature:"", active:true, isDemo:true },
    { id: principal1, username:"principal", password:"demo123", name:"Dr. Musa Ibrahim", role:"PRINCIPAL", photo:"", signature:"", active:true, isDemo:true },
    { id: supervisor1, username:"supervisor", password:"demo123", name:"Mr. Femi Adewale", role:"ACADEMIC_SUPERVISOR", photo:"", signature:"", active:true, isDemo:true },
    { id: teacherA, username:"teachera", password:"demo123", name:"Mr. Ahmad Sule", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true },
    { id: teacherB, username:"teacherb", password:"demo123", name:"Mrs. Bimpe Alade", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true },
    { id: formTeacherC, username:"teacherc", password:"demo123", name:"Mrs. Aisha Bello", role:"TEACHER", photo:"", signature:"", active:true, isDemo:true }
  ];

  var engSubj = subjects.filter(function(s){return s.code==="ENG";})[0];
  var mthSubj = subjects.filter(function(s){return s.code==="MTH";})[0];
  var jss1a = findCA("JSS1A"), jss1b = findCA("JSS1B");

  var teacherAssignments = [
    { id: uid("ta"), teacherId: teacherA, subjectId: engSubj.id, classArmId: jss1a.id, sessionId: sessionId, termId: term1, active:true },
    { id: uid("ta"), teacherId: teacherA, subjectId: engSubj.id, classArmId: jss1b.id, sessionId: sessionId, termId: term1, active:true },
    { id: uid("ta"), teacherId: teacherB, subjectId: mthSubj.id, classArmId: jss1a.id, sessionId: sessionId, termId: term1, active:true }
  ];

  var formTeacherAssignments = [
    { id: uid("fta"), teacherId: formTeacherC, classArmId: jss1a.id, sessionId: sessionId, active:true },
    { id: uid("fta"), teacherId: teacherA, classArmId: jss1a.id, sessionId: sessionId, active:false }
  ];

  function stu(name, gender, classArmId, sectionId, dept){
    return {
      id: uid("stu"), admissionNo: "LB/" + Math.floor(1000+Math.random()*9000),
      name:name, gender:gender, dob:"", photo:"",
      sectionId:sectionId, classArmId:classArmId, departmentId: dept||null,
      status:"Active", guardianPhone:"", address:"", customFields:{},
      enrollmentHistory:[{ sessionId:sessionId, classArmId:classArmId, sectionId:sectionId, departmentId: dept||null }],
      createdAt: Date.now(), isDemo:true
    };
  }

  var students = [
    stu("Ahmad Musa","Male", jss1a.id, sectionJSS),
    stu("Aisha Ali","Female", jss1a.id, sectionJSS),
    stu("Umar Bello","Male", jss1a.id, sectionJSS),
    stu("Chidinma Eze","Female", jss1a.id, sectionJSS),
    stu("Tunde Bakare","Male", jss1b.id, sectionJSS),
    stu("Grace Danladi","Female", findCA("SS1 Science A").id, sectionSS, deptScience),
    stu("Peter Obi","Male", findCA("SS1 Arts A").id, sectionSS, deptArts)
  ];
  students[1].customFields = {}; // Aisha profile intentionally incomplete (no DOB/photo/guardian phone)
  students[0].dob = "2013-04-12"; students[0].guardianPhone="0803 000 1111"; students[0].address="12 Palm Street, Kano";
  students[2].dob = "2013-01-02"; students[2].guardianPhone="0803 222 3333"; students[2].address="4 Zoo Road, Kano";
  students[3].dob = "2013-06-19"; students[3].guardianPhone="0803 444 5555"; students[3].address="9 Ring Road, Kano";

  var commentTemplates = [
    { id: uid("ct"), text:"Excellent performance. Keep it up.", category:"positive", sectionId:null, active:true },
    { id: uid("ct"), text:"Very good performance this term.", category:"positive", sectionId:null, active:true },
    { id: uid("ct"), text:"Good effort; continue working hard.", category:"neutral", sectionId:null, active:true },
    { id: uid("ct"), text:"Shows good potential; needs more consistency.", category:"neutral", sectionId:null, active:true },
    { id: uid("ct"), text:"Needs more concentration in class.", category:"improvement", sectionId:null, active:true },
    { id: uid("ct"), text:"Needs improvement in academic performance.", category:"improvement", sectionId:null, active:true },
    { id: uid("ct"), text:"Must improve class participation.", category:"improvement", sectionId:null, active:true }
  ];

  return {
    __app: "ladybird-whole-school", __version: 1,
    currentUser: null,
    view: "login",
    viewParams: {},
    school: {
      name: "Ladybird College",
      motto: "Knowledge, Character, Excellence",
      address: "12 Unity Road, Kano, Nigeria",
      phone: "0800 000 0000",
      email: "info@ladybirdcollege.example",
      website: "www.ladybirdcollege.example",
      logo: "",
      stamp: ""
    },
    sessions: [{ id: sessionId, name: "2026/2027", active:true }],
    currentSessionId: sessionId,
    terms: [
      { id: term1, sessionId: sessionId, name:"First Term", order:1, nextTermStartDate:"" },
      { id: term2, sessionId: sessionId, name:"Second Term", order:2, nextTermStartDate:"" },
      { id: term3, sessionId: sessionId, name:"Third Term", order:3, nextTermStartDate:"" }
    ],
    currentTermId: term1,
    sections: [
      { id: sectionNursery, name:"Nursery", order:1 },
      { id: sectionPrimary, name:"Primary", order:2 },
      { id: sectionJSS, name:"Junior Secondary", order:3 },
      { id: sectionSS, name:"Senior Secondary", order:4 }
    ],
    departments: [
      { id: deptScience, sectionId: sectionSS, name:"Science", active:true },
      { id: deptArts, sectionId: sectionSS, name:"Arts", active:true },
      { id: deptCommercial, sectionId: sectionSS, name:"Commercial", active:true }
    ],
    classArms: classArms,
    subjects: subjects,
    assessmentSchemes: [
      { id: schemeSecondary, name:"Secondary Standard", scope:"section", sectionIds:[sectionJSS,sectionSS],
        components:[
          { id: uid("comp"), name:"CA1", maxScore:15, weight:15, order:1, active:true },
          { id: uid("comp"), name:"CA2", maxScore:15, weight:15, order:2, active:true },
          { id: uid("comp"), name:"Exam", maxScore:70, weight:70, order:3, active:true }
        ] },
      { id: schemePrimary, name:"Primary Standard", scope:"section", sectionIds:[sectionPrimary],
        components:[
          { id: uid("comp"), name:"Test 1", maxScore:20, weight:20, order:1, active:true },
          { id: uid("comp"), name:"Test 2", maxScore:20, weight:20, order:2, active:true },
          { id: uid("comp"), name:"Exam", maxScore:60, weight:60, order:3, active:true }
        ] },
      { id: schemeNursery, name:"Nursery Descriptive", scope:"section", sectionIds:[sectionNursery],
        components:[
          { id: uid("comp"), name:"Continuous Assessment", maxScore:100, weight:100, order:1, active:true }
        ] }
    ],
    gradingSchemes: [
      { id: gradingSecondary, name:"WAEC-Style A1-F9", scope:"section", sectionIds:[sectionJSS,sectionSS,sectionPrimary],
        bands:[
          {grade:"A1",min:75,max:100,point:1,remark:"Excellent"},
          {grade:"B2",min:70,max:74,point:2,remark:"Very Good"},
          {grade:"B3",min:65,max:69,point:3,remark:"Good"},
          {grade:"C4",min:60,max:64,point:4,remark:"Credit"},
          {grade:"C5",min:55,max:59,point:5,remark:"Credit"},
          {grade:"C6",min:50,max:54,point:6,remark:"Credit"},
          {grade:"D7",min:45,max:49,point:7,remark:"Pass"},
          {grade:"E8",min:40,max:44,point:8,remark:"Pass"},
          {grade:"F9",min:0,max:39,point:9,remark:"Fail"}
        ]},
      { id: gradingNursery, name:"Descriptive Only", scope:"section", sectionIds:[sectionNursery],
        bands:[
          {grade:"Excellent",min:90,max:100,point:1,remark:"Excellent"},
          {grade:"Very Good",min:75,max:89,point:2,remark:"Very Good"},
          {grade:"Good",min:60,max:74,point:3,remark:"Good"},
          {grade:"Developing",min:40,max:59,point:4,remark:"Developing"},
          {grade:"Needs Improvement",min:0,max:39,point:5,remark:"Needs Improvement"}
        ]}
    ],
    rankingConfig: { basis:"average", scope:"classArm", tieMethod:"competition", requireCompleteResults:true },
    users: users,
    teacherAssignments: teacherAssignments,
    formTeacherAssignments: formTeacherAssignments,
    students: students,
    scores: [], // { id, studentId, subjectId, classArmId, sessionId, termId, components:{compId:val|'ABS'|'EXC'|null}, status }
    classSubjectStatus: {}, // key `${classArmId}_${subjectId}_${sessionId}_${termId}` -> status
    classApproval: {}, // key `${classArmId}_${sessionId}_${termId}` -> {status, reviewedBy, approvedBy, publishedAt}
    studentComments: {}, // key `${studentId}_${sessionId}_${termId}` -> {formTeacherComment, principalComment, nextFees, examFee}
    commentTemplates: commentTemplates,
    signatures: [
      { id: uid("sig"), role:"PRINCIPAL", userId: principal1, name:"Dr. Musa Ibrahim", image:"", active:true }
    ],
    affectiveDomains: [
      {id:uid("dom"), name:"Punctuality", active:true}, {id:uid("dom"), name:"Neatness", active:true},
      {id:uid("dom"), name:"Cooperation", active:true}, {id:uid("dom"), name:"Leadership", active:true},
      {id:uid("dom"), name:"Honesty", active:true}
    ],
    psychomotorDomains: [
      {id:uid("dom"), name:"Handwriting", active:true}, {id:uid("dom"), name:"Sports", active:true},
      {id:uid("dom"), name:"Creativity", active:true}
    ],
    ratingLevels: ["Excellent","Very Good","Good","Fair","Poor"],
    domainScores: {}, // key `${studentId}_${sessionId}_${termId}` -> {affective:{domId:rating}, psychomotor:{domId:rating}}
    attendance: {}, // key `${studentId}_${sessionId}_${termId}` -> {totalDays, present, absent, late}
    reportTemplates: [
      { id: uid("rt"), name:"SS Premium Academic", sectionIds:[sectionSS], style:"classic-navy", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"SS Modern Executive", sectionIds:[sectionSS], style:"modern-teal", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"SS Royal Premium", sectionIds:[sectionSS], style:"royal-purple", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"JSS Premium Academic", sectionIds:[sectionJSS], style:"crimson-gold", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"JSS Corporate Slate", sectionIds:[sectionJSS], style:"corporate-slate", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"JSS Elegant Serif", sectionIds:[sectionJSS], style:"elegant-serif", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"Primary Child-Friendly", sectionIds:[sectionPrimary], style:"sunburst-orange", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"Primary Forest Green", sectionIds:[sectionPrimary], style:"forest-green", showPhoto:true, showAttendance:true, showAffective:true, showFees:true, isDefault:false, active:true },
      { id: uid("rt"), name:"Nursery Early Learning", sectionIds:[sectionNursery], style:"minimal-mono", showPhoto:true, showAttendance:false, showAffective:true, showFees:true, isDefault:true, active:true },
      { id: uid("rt"), name:"Nursery Elegant Maroon", sectionIds:[sectionNursery], style:"double-frame-formal", showPhoto:true, showAttendance:false, showAffective:true, showFees:true, isDefault:false, active:true }
    ],
    customFieldDefs: [], // {id,name,type,required,sectionIds,order,active}
    auditLog: [],
    notifications: [],
    isDemoData: true
  };
}

function addAudit(state, action, details){
  state.auditLog.unshift({
    id: uid("log"), time: new Date().toISOString(),
    user: state.currentUser ? state.currentUser.name : "System",
    role: state.currentUser ? state.currentUser.role : "",
    action: action, details: details || ""
  });
  if (state.auditLog.length > 500) state.auditLog.length = 500;
}
