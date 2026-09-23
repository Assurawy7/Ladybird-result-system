-- ==========================================================================
-- Ladybird Whole-School System — Neon PostgreSQL schema
-- Compatibility-first design: the entire shared school "state" object that
-- the frontend already works with (state.students, state.scores, ...) is
-- kept as ONE JSONB document, mirroring the old Firestore records/core
-- document. This avoids a full relational rewrite of the frontend while
-- still moving auth, revisions and concurrency control onto a real backend.
-- ==========================================================================

-- One row (id = 1) holds the whole school's shared state, as JSONB.
-- Mirrors the old records/core Firestore document, minus currentUser/view/
-- viewParams (device-local) and minus plaintext passwords (see _state.js,
-- which hashes any state.users[].password into passwordHash before this
-- row is written, and strips it before the row is ever sent to a browser).
CREATE TABLE IF NOT EXISTS school_state (
    id          INTEGER PRIMARY KEY,
    state       JSONB NOT NULL,
    revision    BIGINT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  TEXT NULL
);

-- Photos / logo / stamp / signatures. Mirrors the old media/{key} Firestore
-- collection — kept separate from school_state so the JSONB document never
-- has to carry base64 image data directly.
CREATE TABLE IF NOT EXISTS media (
    key         TEXT PRIMARY KEY,
    data_url    TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server-side sessions for the HTTP-only session cookie. We store a SHA-256
-- hash of the session token (never the raw token) so a leaked database
-- backup cannot be used to forge sessions.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    user_agent  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Seed the single state row as an empty placeholder if it doesn't exist yet.
-- The actual seed/demo state (or a migrated Firebase state) is written by
-- scripts/migrate-firebase-to-neon.js or by state-get.js on first boot
-- (see netlify/functions/state-get.js, which falls back to the app's own
-- seedState() being sent up from the browser on first run, exactly like the
-- old Firestore code did when records/core didn't exist yet).
INSERT INTO school_state (id, state, revision)
VALUES (1, '{}'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;
