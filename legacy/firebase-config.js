/* ==========================================================================
   FIREBASE CONFIG
   This is the school's own Firebase project. These values identify the
   project (they are not secret keys) - see README section 8 for how Firestore
   access is actually restricted using security rules + anonymous auth.
   ========================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBKO24uqK7LDaXqkrmLZZNF7X9FAgz9PlA",
  authDomain: "ladybird-school.firebaseapp.com",
  projectId: "ladybird-school",
  storageBucket: "ladybird-school.firebasestorage.app",
  messagingSenderId: "899133518991",
  appId: "1:899133518991:web:cd25208d1e8c2df4bbacfa",
  measurementId: "G-L2T7KNN4BC"
};

/* Firestore layout used by this app (see source/02-state.js):
     records/core        - one document holding the whole school's shared state
                            (students, scores, assignments, approvals, settings...)
     media/{key}          - one small document per photo/logo/signature image,
                            kept separate so the 1MB Firestore document limit
                            is never hit by the core document.
*/
window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();

/* Offline persistence: caches data locally (IndexedDB) so the app keeps
   working with no internet - viewing already-synced data, and queuing any
   changes made while offline. Firestore automatically re-syncs everything
   the moment the device is back online, with no extra code needed here.
   `synchronizeTabs:true` keeps multiple open tabs of the app in agreement.
   If the browser doesn't support this (very old browsers, some private
   browsing modes), the app still works normally - it just requires an
   internet connection at all times, same as before. */
window.firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function(err){
  console.warn("Offline persistence not enabled:", err.code, "- app will still work, just requires an internet connection.");
});
