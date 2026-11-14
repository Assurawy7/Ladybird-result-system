# Phase 0 changes (security, accuracy, reliability)

| # | Change | Files |
|---|---|---|
| 1 | Grade bands no longer leave gaps: 74.5 now gets B2 instead of "-". Whole-number totals give exactly the same grade as before. | source/04-engine.js |
| 2 | Photos, logins and page loads no longer read the whole school database from Neon to check who is signed in. Same access rule as before. | netlify/functions/_auth.js, auth-session.js, auth-login.js, media-get.js, media-save.js, media-delete.js |
| 3 | Login: same message for wrong username or wrong password; 8 wrong tries per username (or 40 per connection) pauses logins for up to 15 minutes. | auth-login.js, _throttle.js, db/schema.sql |
| 4 | First-time setup of an empty database is locked unless ALLOW_SEED=true is set. | netlify/functions/state-save.js, .env.example |
| 5 | The demo-account list and the demo123 hint on the login screen appear only while active demo accounts exist. | source/06-login.js, netlify/functions/state-get.js |
| 6 | Reload Demo Data is hidden/refused when real students exist, and needs a typed word otherwise. | source/02-state.js, source/22-settings-users-backup.js |
| 7 | The save indicator shows the real result (Saving / All changes saved / Not saved yet). | source/02-state.js, source/10-score-entry.js |
| 8 | Security headers; scripts re-checked on every load; build runs on every deploy. | netlify.toml |
| 9 | Service worker: fresh files on install, errors never cached, offline page-load fallback. | service-worker.template.js |

| 10 | Photos: a picture that fails to load on one device can no longer erase its link for everyone; pictures load in the background 6 at a time; a picture is deleted only when someone deliberately removes it. | source/02-state.js |
| 11 | Repair tool for photos that already disappeared (dry run by default). | scripts/repair-media-links.js, netlify/functions/_r2.js |

Photo and signature permissions are deliberately UNCHANGED.

Run the automated checks with `npm test`.
