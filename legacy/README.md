# Legacy Firebase files (archived, not used in production)

These files were the app's ORIGINAL Firebase backend, before the Neon +
Netlify Functions migration (see /docs/migration.md and the top-level
README). They are kept here for reference/rollback only:

- `firebase-config.js` — the old Firebase project config (client keys only,
  not secrets) and `firebaseApp`/`firebaseAuth`/`firebaseDb` initialization.
- `firestore.rules` — the old Firestore security rules. These no longer
  protect anything; Neon access is now controlled entirely by
  netlify/functions/_auth.js and _state.js.

Nothing in the production frontend (index.html, app.js, source/*.js)
references these files anymore. Do not re-add the Firebase `<script>` tags
to index.html unless you are intentionally rolling back the migration.
