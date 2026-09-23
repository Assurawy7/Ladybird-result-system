# Migration: Firebase → Neon PostgreSQL + Netlify Functions

## Why

The app previously stored everything in Firestore (`records/core` for
shared school data, a `media` collection for images) and used Firebase
anonymous auth plus a client-side password check for login. That meant
**anyone who found the Firestore project ID could read or write school data
directly**, bypassing the app's role checks entirely, because those checks
only ever ran in the browser. This migration moves the trust boundary onto
a real backend without changing anything about how the app looks, feels, or
is used day to day.

## What changed, file by file

Firebase usage was confined to exactly three places (confirmed by grepping
the whole repository before making any changes): `source/02-state.js`,
`firebase-config.js`, and two `<script>` tags in `index.html`. No other UI
module (`03-auth.js` through `23-boot.js`, all 22 files) ever touched
Firebase directly — they only ever read/wrote the shared `state` object and
called `scheduleSave()`/`persistNow()`. That's what made a compatibility-
layer migration (rather than a rewrite) possible.

| Old | New |
|---|---|
| Firestore `records/core` document | Neon `school_state` table, one row (`id=1`), `state` JSONB column |
| Firestore `media/{key}` documents | Neon `media` table, one row per key |
| `firebase-app-compat.js` / `firebase-auth-compat.js` / `firebase-firestore-compat.js` `<script>` tags | removed from `index.html` |
| `firebase-config.js` | archived to `legacy/firebase-config.js`, not loaded |
| `firestore.rules` | archived to `legacy/firestore.rules`, no longer enforces anything |
| `coreRef.onSnapshot()` live push | `state-get.js` polled every ~2s (`startLiveSync()` in `source/02-state.js`) |
| Firebase anonymous auth + plaintext password compare in the browser | `auth-login.js`: bcrypt hash compare server-side, HTTP-only session cookie |
| `_rev` / `_lastWriter` fields on the document | Neon `revision` column, `updated_by` column |
| Client-side `runTransaction()` merge-by-id | Server-side transaction (`SELECT ... FOR UPDATE`) + the same merge-by-id/merge-by-key logic, ported to `netlify/functions/_state.js` |
| Firestore's built-in offline persistence | `localStorage` snapshot cache + a `_pendingSave` retry queue (see `source/02-state.js`) — a from-scratch equivalent, since Neon/Netlify Functions have no built-in offline cache the way the Firestore SDK did |

`source/02-state.js` and `source/03-auth.js` were rewritten; every function
name and signature that other files call (`loadState`, `scheduleSave`,
`persistNow`, `tryLogin`, `logout`, `canManageSettings`, `isFormTeacherOf`,
etc.) is unchanged, so `04-engine.js` through `23-boot.js` did not need to
change — except `source/06-login.js`, which needed a small update because
`tryLogin()` is now asynchronous (it has to ask a server).

`app.js` is a **generated file** — it's the concatenation of everything in
`source/`, in filename order (this was true before the migration too; see
`scripts/build.js`, which replaces the manual `cat source/*.js > app.js`
step). Run `npm run build` after editing anything in `source/`.

## New backend authorization model

`netlify/functions/_state.js`'s `enforceRbacOnSave()` is the real
enforcement, mirroring what `source/03-auth.js`'s client-side functions
already described:

- **SUPER_ADMIN / ADMIN** — unrestricted (`canManageSettings()` is true for
  both).
- **PRINCIPAL / ACADEMIC_SUPERVISOR** — whole-school academic access, but
  cannot touch settings-type collections (subjects, class structure,
  grading schemes, teacher assignments, users, school branding, etc — see
  `RESTRICTED_SETTINGS_KEYS`). Only PRINCIPAL can publish results
  (`canPublish()`); only ADMIN/SUPER_ADMIN can reopen a published class.
- **TEACHER** — narrowest role. Can only change: scores for their own
  assigned subject+class pairs; `classSubjectStatus`/`classApproval` for
  their own subject+class or their own form class; student
  comments/domain-scores/attendance for students in their own form class;
  student records within their own form class; and their own user profile
  (name/password/photo/signature only — not role/username/active status).
  Everything else in a save request from a Teacher is rejected with a 403
  if it differs from the current database state.

This is enforced **in addition to**, not instead of, the existing
client-side checks in `source/03-auth.js` — those still give immediate UI
feedback (hiding buttons a role can't use); the server-side copy is what
actually protects the data if someone bypasses the UI.

## Deployment walkthrough

1. `npm install`
2. Create a Neon project, copy the pooled `DATABASE_URL`.
3. `DATABASE_URL=... npm run db:migrate` — creates `school_state`, `media`,
   `sessions` tables.
4. Push to GitHub, connect the repo in Netlify, set `DATABASE_URL` and
   `SESSION_SECRET` as Netlify environment variables, deploy.
5. **If migrating real data from a live Firebase deployment** (skip this
   for a brand-new install — it'll self-seed with demo data instead):
   - Firebase console → Project settings → Service accounts → Generate new
     private key → save it locally, e.g. `service-account.local.json`
     (already in `.gitignore` — never commit it).
   - `FIREBASE_SERVICE_ACCOUNT=./service-account.local.json DATABASE_URL=... npm run migrate:firebase`
   - `FIREBASE_SERVICE_ACCOUNT=./service-account.local.json DATABASE_URL=... npm run verify:migration`
     and confirm every count matches and there are no broken references
     before telling anyone to switch over.
   - Firebase data is untouched (copy, not move) — keep it as a rollback
     option until the checklist below is fully green in production.
6. Open the live URL, sign in with one of the demo/migrated accounts, and
   work through the test checklist below.

## Test checklist — run this before trusting it with real student data

**This environment has no network access**, so none of the following has
actually been run — only syntax-checked (`node --check` on every function
and script file, all passing). Please work through this list yourself (or
ask a developer to) before go-live:

- [ ] `npm run db:migrate` succeeds against your real Neon `DATABASE_URL`
- [ ] Fresh deploy, never-seeded database: opening the URL seeds demo data
      and shows the login screen with school branding
- [ ] Login works for each demo/migrated role; wrong password is rejected
      with a clear error; session survives a page refresh
- [ ] Logout clears the session (refreshing afterward shows the login
      screen, not the dashboard)
- [ ] **Two-device live sync:** log in as `teachera` on device A, `admin` on
      device B; submit a score on A; confirm it appears on B within a few
      seconds with the "Updated from another device" toast; then reverse
      the test
- [ ] **Teacher security test:** while logged in as a Teacher, try (e.g. via
      browser dev tools, calling `apiSaveState` directly with modified
      JSON) to change another class's data, whole-school settings, or
      another user's account — confirm the server rejects it with a 403
      even though the same action is already hidden from the UI
- [ ] Admin/Principal/Supervisor can each do what section "Backend
      authorization model" above says they can and nothing more —
      specifically confirm Supervisor cannot publish and cannot reach
      Settings
- [ ] Report generation for all 10 themes still matches the pre-migration
      visual output (A4 layout, photo, grades, averages, position,
      comments, signatures, attendance, fees, watermark)
- [ ] Export Backup, then Import Backup on a test deployment — confirm the
      resulting state matches
- [ ] Kill the Neon connection (or point `DATABASE_URL` at a wrong host)
      and confirm the app shows a connection error rather than crashing or
      silently discarding unsaved work
- [ ] Go offline mid-session, make an edit, come back online — confirm the
      edit is saved automatically (via the `_pendingSave` retry) rather
      than lost
- [ ] `npm run migrate:firebase` then `npm run verify:migration` against
      your actual Firebase project, and confirm every collection's count
      matches with no broken references, if you're migrating real data
- [ ] Search the deployed `app.js` for `firebase`/`firestore`/`onSnapshot` —
      should find nothing (already confirmed absent from `source/` in this
      migration; re-check after your own future edits)

## Known limitations, stated plainly (per the "do not claim success without
testing" instruction this migration was built under)

- Nothing above has been executed against a real Neon/Netlify/Firebase
  environment — this sandbox has no network access. Everything here has
  been read carefully against the actual application code and
  syntax-checked, not run.
- `enforceRbacOnSave()` checks collection-level and record-level
  permissions, not an exhaustive field-by-field schema — see the README's
  "What the backend security does and doesn't cover" section.
- The offline queue (`_pendingSave`) retries once on the browser's `online`
  event; it does not persist a pending save across a full page reload while
  still offline (Firestore's offline persistence did). If that matters for
  your users' connectivity patterns, it's a reasonable next hardening step.
- Orphaned `media` rows for deleted students are not cleaned up (carried
  over unchanged from the Firebase version — not a new limitation).
