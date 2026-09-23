# Ladybird Whole-School Academic Result Management System

A whole-school result-management system with configurable school structure,
students, teachers, assessment/grading, score entry, approval workflow,
comments, signatures, report cards, analytics, and audit logging — backed by
**Netlify Functions + Neon PostgreSQL**, so a teacher submitting scores on
their phone shows up for the Admin on their laptop within a couple of
seconds, with real server-side authentication behind it.

> **Migrated from Firebase.** This app originally ran on Firebase
> Auth/Firestore. It now runs on Netlify Functions + Neon Postgres — same
> UI, same features, same workflow, real backend security added. See
> [`docs/migration.md`](docs/migration.md) for the full story, and
> [`legacy/README.md`](legacy/README.md) for the archived Firebase files.

## 1. Architecture

```
Browser (index.html + app.js, a static PWA)
   |  fetch() to same-origin /.netlify/functions/*
   v
Netlify Functions (netlify/functions/*.js)
   |  @neondatabase/serverless
   v
Neon PostgreSQL (school_state, media, sessions tables)
```

- **Frontend:** unchanged static PWA (HTML/CSS/JS, no build tooling required
  to run it — `npm run build` just concatenates `source/*.js` into `app.js`,
  the same relationship that existed before).
- **Hosting:** Netlify (static site + serverless functions in one deploy).
- **Backend:** Netlify Functions — `auth-login`, `auth-session`,
  `auth-logout`, `state-get`, `state-save`, `media-get`, `media-save`,
  `media-delete` (see `netlify/functions/`).
- **Database:** Neon Postgres. All shared school data (students, scores,
  assignments, approvals, settings, comments, audit log, user accounts —
  everything `state.*` used to be in Firestore) still lives as **one JSON
  document**, in `school_state.state` — same design as the old
  `records/core` Firestore document, just in a `JSONB` column instead.
  Photos/logo/stamp/signatures are still stored one-row-per-image, in
  `media`, for the same reason as before (keep the main document small).
- **Authentication:** real server-side sessions. Login posts a
  username/password to `auth-login`, which checks a **bcrypt hash** (not
  plaintext) and sets an **HTTP-only, Secure session cookie**. Every
  protected endpoint re-derives the caller's identity and role from that
  cookie + the database — never from anything the browser claims about
  itself. See section 5 below for exactly what this does and doesn't cover.

## 2. Deploying it

**One-time setup:**

1. **Create a Neon project** — [neon.tech](https://neon.tech) → New Project.
   Copy the **pooled connection string** from Connection Details.
2. **Push this repo to GitHub**, then in Netlify: **Add new site → Import
   from Git** → pick the repo.
3. **Set environment variables** (Netlify → Site settings → Environment
   variables): `DATABASE_URL` (the Neon connection string) and
   `SESSION_SECRET` (any long random string). See `.env.example`.
4. **Deploy.** Netlify runs `npm run build` (regenerates `app.js` from
   `source/`) and publishes the site + functions in one step.
5. **Initialize the database** — run once, from your own machine, pointed at
   the same `DATABASE_URL`:
   ```
   npm install
   npm run db:migrate
   ```
   This creates the `school_state`, `media`, and `sessions` tables (safe to
   re-run any time — see `db/schema.sql`).
6. **Open the live URL.** A brand-new, never-seeded database will seed
   itself with the same built-in demo school/teachers/students the app
   always shipped with (see section 3), the first time anyone opens it.

**If you're moving from a live Firebase deployment of this app** (i.e. you
have real school data already in Firestore, not just the demo data). See
[`docs/migration.md`](docs/migration.md) — in short:
```
FIREBASE_SERVICE_ACCOUNT=./service-account.local.json DATABASE_URL=... npm run migrate:firebase
FIREBASE_SERVICE_ACCOUNT=./service-account.local.json DATABASE_URL=... npm run verify:migration
```
Firebase data is **not deleted** by this — it's a copy, kept as a rollback
option until you've verified everything (logins, live sync, reports,
permissions) on the new backend.

**Local development:**
```
npm install
netlify dev
```
`netlify dev` serves `index.html`/`app.js` and runs the functions locally
against whatever `DATABASE_URL` is in your local `.env` (copy it from
`.env.example`).

## 3. Demo logins

Password for every demo account: `demo123`

| Username     | Role                          | Notes |
|--------------|-------------------------------|-------|
| `superadmin` | Super Admin                   | Full access |
| `admin`      | Admin                         | Full whole-school access |
| `principal`  | Principal                     | Full whole-school academic access, can publish |
| `supervisor` | Academic Supervisor           | Full whole-school academic access, cannot publish or manage settings |
| `teachera`   | Teacher                       | Teaches English in JSS1A and JSS1B |
| `teacherb`   | Teacher                       | Teaches Mathematics in JSS1A only |
| `teacherc`   | Teacher + Form Teacher        | Form Teacher of JSS1A (dual role) |

Try it across two devices (or two browser windows) at once: log in as
`teachera` on one, `admin` on the other. Submit a score on one — watch it
appear on the other within a couple of seconds, with an "Updated from
another device" toast.

## 4. How the live sync works now

- All shared school data lives in **one Postgres row**: `school_state` where
  `id = 1`, in a `JSONB` column called `state`.
- Every save increments a `revision` counter. Firestore used to **push**
  changes to every open tab (`onSnapshot`); a static site talking to
  Postgres has no equivalent, so the browser instead **polls**
  `state-get` roughly every 2 seconds while the tab is visible and you're
  logged in, comparing revisions. A poll that comes back with the same
  revision you already have does nothing; a newer one is merged in and the
  screen updates — same live feel, pull instead of push.
- **Photos, the school logo, and signatures** are still stored separately,
  one row per image in `media`, fetched on demand — same reasoning as
  before (keep the main JSON document small), implemented as lazy
  fetch-on-demand instead of a live collection listener.
- Who's logged in and which screen you're on are still **not synced** —
  local to each device/tab, as before.
- **What's genuinely new:** saves are authenticated and authorized on the
  server (`netlify/functions/_auth.js`, `_state.js`), not just checked in
  the browser. A Teacher account can no longer, say, edit another class's
  settings by manually calling the API with modified JSON — the server
  checks their actual role and assignments against the database before
  accepting any change. See section 5.

## 5. What the backend security does and doesn't cover

**What you now genuinely have:** passwords are bcrypt-hashed (never stored
or sent to the browser in plaintext), sessions are HTTP-only cookies tied to
a server-side session table (not a client-trusted flag), and every write is
re-checked server-side against the caller's real role and assignments —
not just hidden in the UI. A Teacher's `state-save` request that tries to
touch another class, another subject, whole-school settings, or another
user's account is rejected with a 403 before it ever reaches the database.

**Known limitation, stated plainly:** the server-side permission check
(`enforceRbacOnSave` in `netlify/functions/_state.js`) is enforced at the
level of "which top-level collections changed, and were you allowed to
touch those specific records" — the same boundaries the old client-side
`assertPermission()` calls already described (own subject/class, own form
class, own account). It is **not** an exhaustive field-by-field JSON-schema
validator of every possible shape the state document could take. This is a
real, meaningful security improvement over the old fully-client-side model,
not a complete formal specification — treat it as the first hardening pass,
and extend `enforceRbacOnSave` if you find a gap (or ask your developer /
come back to Claude with this repo).

**Not yet load-tested.** This environment couldn't reach the internet, so
none of the above has been run against a live Neon database, a real Netlify
deploy, or real concurrent multi-device traffic — see
[`docs/migration.md`](docs/migration.md) for the exact test checklist to run
before trusting this with real student data.

## 6. Data scale note

The whole-school JSON document approach comfortably covers a school with
several hundred to low-thousands of students across many terms — Postgres
`JSONB` has no practical 1MB ceiling the way Firestore documents did, so
this migration also removes the old scale ceiling mentioned in the previous
version of this README. Very large multi-thousand-student deployments would
still eventually benefit from sharding (e.g. one row per session/class-arm)
for write-throughput reasons, but that's a future optimization, not a
current limit.

## 7. Concurrent edits

Saves merge by record id when a device was stale (had missed updates made
elsewhere): if another device added a student/teacher/score while you were
offline, your next save merges that in rather than erasing it (see
`mergeStale()` in `netlify/functions/_state.js`, ported from the old
client-side merge logic — now run server-side inside a single transaction
with `SELECT ... FOR UPDATE`, closing a race condition the old client-side
version couldn't fully close). The one case this doesn't cover: if the exact
same record was genuinely edited on two devices in the same window, the
later save wins for that specific record.

## 8. Photos & media

- Uploaded images are compressed client-side (resized + JPEG-compressed)
  before upload, typically 20-80KB each.
- Deleting a student does **not** currently delete their orphaned photo row
  from `media` (a minor cleanup task, not a functional problem — carried
  over unchanged from the Firebase version).

## 9. What's genuinely implemented (full feature list)

- **Stays logged in** across page refreshes (server-side session cookie,
  30-day expiry) and app relaunches.
- **10 visually distinct report card themes** (Classic Navy, Modern Teal,
  Royal Purple, Crimson & Gold, Corporate Slate, Elegant Serif, Sunburst
  Orange, Forest Green, Minimal Mono, Double Frame Formal) with a bordered
  frame, watermark crest, per-subject Class Average/Position/Remark columns,
  and a classic 5-4-3-2-1 Skills/Behaviours rating grid
- Installable as a proper app on both desktop (Chrome/Edge "Install" prompt)
  and Android (visible "Install App" button, in addition to the browser's
  own install banner)
- Fully configurable Sections → Classes/Arms → Departments/Categories →
  Subjects (nothing about Nursery/Primary/JSS/SS is hard-coded)
- **Mixed-department classes with per-student subject selection**: a single
  class-arm can contain students personally assigned to different
  departments (Science/Arts/Commercial), with department-based subject
  suggestions the Form Teacher can fine-tune per student
- Configurable assessment schemes (any components/weights) and grading
  scale/bands, per section
- Blank vs. Absent vs. Excused vs. Zero are tracked as distinct states
- Teacher assignment (Subject Teacher + Form Teacher, can overlap on one
  account) with duplicate-assignment prevention
- Student profiles with photo upload/compression, bulk add, movement
  between classes with preserved history, configurable custom fields, and a
  profile-completion indicator
- Full approval workflow with audit trail: Draft → Submitted → Form Teacher
  Review/Return/Approve → Admin/Principal Final Approval → Published →
  Reopen (with required reason)
- Real deletion (not just deactivation) for Students, Subjects, Teacher
  accounts, and whole-school Users, with confirmation and cascade cleanup
- A one-click "Remove Demo Accounts & Students" tool (Settings → Backup &
  Data)
- Report cards print cleanly on a single A4 sheet per student
- Skills/Behaviour (affective/psychomotor) ratings entered per student, per
  term
- Bulk teacher assignment across subjects/classes/terms in one click
- Comment library (predefined + custom + select-and-edit), Form Teacher and
  Principal comments, per-student next-term fees/exam fees
- Signature image uploads, school branding/logo
- Report card generation with template variables, live preview, and
  single/bulk print (browser print-to-PDF)
- Role-specific dashboards, subject/teacher analytics, full audit log
- JSON backup export/import (backs up the live database, not a device)
- Installable PWA (manifest + service worker + icons)
- Offline support: keeps working with no connection (viewing already-loaded
  data, queuing edits made while offline) and syncs automatically on
  reconnect — see `source/02-state.js`'s `_pendingSave` queue and the
  `online` event listener (a from-scratch implementation now that Firestore's
  built-in offline persistence is gone — see `docs/migration.md` for what's
  different).

## 10. Folder structure

```
index.html                  - the app shell (loads app.js, styles.css - no SDK tags anymore)
app.js                      - the entire application logic, bundled (this is what runs)
styles.css                  - all styling
manifest.json               - PWA manifest
service-worker.js           - offline cache for the app shell (never caches /.netlify/functions/*)
icons/                      - app icons
source/                     - app.js split into ~24 readable modules. Edit here, then
                               `npm run build` to regenerate app.js.
netlify/functions/          - the backend: auth, state, media endpoints (+ _db.js/_auth.js/_state.js helpers)
db/schema.sql                - Neon table definitions (school_state, media, sessions)
scripts/                    - build.js, db-migrate.js, migrate-firebase-to-neon.js, verify-migration.js
legacy/                     - archived Firebase files (firebase-config.js, firestore.rules) - not used in production
docs/migration.md           - full Firebase -> Neon migration writeup
netlify.toml                 - Netlify build/deploy config
.env.example                 - environment variable placeholders
```

## 11. Resetting / clearing data

Settings → Backup & Data — these affect the **whole live database**, not
just your device:
- **Reload Demo Data** — wipes the shared database and restores the
  original seeded demo school, teachers, and students, for everyone.
  (Admin/Super Admin only — enforced server-side.)
- **Wipe All Data** — erases everything with no demo data restored (asks
  for a typed confirmation first). Admin/Super Admin only, enforced
  server-side.
- **Export Backup** — do this regularly; it's your independent copy outside
  Neon, in case anything ever goes wrong with the database itself.
