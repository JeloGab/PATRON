# PATRON

Web-based parish management system with **verifiable document issuance**, built for the
Catholic parishes of the **Diocese of Libmanan**. Undergraduate capstone thesis, BSIT,
Ateneo de Naga University. Two developers.

A parish keeps its sacramental registers — baptism, confirmation, marriage, death — in
bound ledgers. When a parishioner needs a certificate for a school, a wedding or a
passport, they travel to the parish office, the staff search the ledgers by hand, and a
certificate is typed and signed. What the parishioner receives is a sheet of paper with a
signature on it: whoever receives it next has no way to confirm it came from the parish.

PATRON addresses both halves of that. It moves the registers, the request queue, the
event calendar and the parish's public presence online, and every certificate it issues
carries a **verification code and QR** resolving to a public page that confirms validity
without an account and without exposing the record.

---

## Quick start

### Prerequisites

- **Node 22.x** (`server/package.json` pins `engines.node`)
- A **Supabase project** — used as *managed Postgres only*
- The Supabase CLI, which comes from the root `package.json`; call it as `npx supabase`
- Docker is **not** required. `db push` prints a Docker warning and works without it

### 1. Install

Three `package.json` files, three installs:

```powershell
npm install              # repo root — the Supabase CLI only
cd server;   npm install
cd ..\frontend; npm install
```

### 2. Build the database

From the repo root:

```powershell
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

That is the whole of it. **Nothing is typed into the SQL editor** — both database role
passwords (`patron_app`, `patron_admin`) and the first sysadmin account come from
migrations, so a new database is `link` + `db push`. The only per-project values are the
project ref, `SUPABASE_URL` and the anon key.

`supabase/migrations/` **is** the schema. The data dictionary in `docs/Entities.md` is
the manuscript's, kept uncorrected, and differs from what was built.

### 3. Configure the server

Create `server/.env` — gitignored, and the server will not boot without most of it:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Connection string as **`patron_app`**, transaction pooler, port **6543** |
| `DATABASE_URL_ADMIN` | Same host and pooler, as **`patron_admin`** |
| `JWT_SECRET` | Signing key for the HS256 tokens Express issues itself |
| `JWT_EXPIRATION` | `8h` |
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_ANON_KEY` | The **anon** key. Verify it decodes to `"role":"anon"` — the service role key is used nowhere in this project |
| `CLIENT_ORIGIN` | `http://localhost:5173` |
| `PORT` | Optional, defaults to `4000` |

Both role passwords are set by migrations: `patron_app` at line 4 of
`20260820153548_init_schema.sql`, `patron_admin` by the `alter role` at the foot of
`20261018080757_sysadmin_setup.sql`. Read them there rather than inventing them — and
note that pushing that second migration to a database that already has a
`patron_admin` **overwrites** its password, so update `server/.env` in the same sitting
or every `/api/admin` call fails with `28P01`.

**`CLIENT_ORIGIN` does two jobs**: it is the CORS allow-list *and* the origin baked into
the QR code on printed certificates. Changing it invalidates the QR on anything already
printed, so the port is pinned — `frontend/vite.config.js` sets `port: 5173` with
`strictPort: true`.

The frontend reads one optional variable, `VITE_API_BASE`, and defaults to
`http://localhost:4000`, so local development needs no `.env` of its own.

### 4. Two Supabase dashboard settings

Parishioner accounts are owned by Supabase Auth, so two console settings are part of the
configuration:

- **Confirm email: ON.**
- **Site URL: the app root** (e.g. `http://localhost:5173`). The server deliberately
  sends no `redirect_to`, so the Site URL *is* where confirmation and recovery links
  land. The frontend runs on `HashRouter` and Supabase returns its tokens in the URL
  fragment — `lib/authFragment.js` claims them in `main.jsx` before the router mounts.

### 5. Run

Two terminals. **Run the API from `server/`, never the repo root** — `dotenv` reads
`.env` from the working directory, and from the root `auth.token.js` throws
`JWT_SECRET is not defined`.

```powershell
cd server;   npx nodemon src/index.js     # API on :4000
cd frontend; npm run dev                  # app on http://localhost:5173
```

Open **`localhost`**, not `127.0.0.1` — CORS is pinned to that exact origin.

### 6. Verify

```powershell
curl.exe http://localhost:4000/api/health
```

A healthy install answers `ok: true` with **`connected_as: "patron_app"`** and
`trgm_installed: true`. `connected_as` naming anything else — `postgres` above all — is
the one failure worth catching immediately: table owners are exempt from row-level
security, so the tenant isolation this system rests on would be silently off.

> **Windows note.** This is a PowerShell project. Heredocs do not work (use
> `@'...'@` piped to `Set-Content`), `curl` is not `curl.exe`, and backslash-escaped JSON
> is bash syntax — PowerShell truncates it. For request bodies use `Invoke-RestMethod`
> with a single-quoted `-Body`.

---

## Architecture

| Layer | Choice |
|---|---|
| Database | PostgreSQL on Supabase, as **managed Postgres only** — no `supabase-js` for data, no PostgREST, no Edge Functions |
| API | **Express 5** (ESM), `pg` with raw SQL and **no ORM** |
| Frontend | React 19 + Vite, `HashRouter`, no UI framework |
| Auth | Express issues its own HS256 JWT for every role; Supabase Auth owns parishioner passwords only |
| Migrations | Supabase CLI, forward-only |

All data access goes through Express. Supabase Auth is reached from exactly one file,
`integrations/supabaseAuth.js`, by raw `fetch`.

### The three rules that explain the code

1. **Express connects as `patron_app`, never `postgres`**, and every query on a
   tenant-scoped table goes through **`withActor(req.user, …)`**, which sets
   `app.parish_id`, `app.user_id` and `app.user_role` for the RLS policies. There is no
   `WHERE parish_id` in application SQL — Postgres filters it. A bare `pool.query` for
   tenant data works, returns rows, and returns *every parish's* rows, so it is reserved
   for non-tenant tables, the `security definer` login lookups, and the public views.
   Sysadmin work uses a second pool, `adminPool`, which reaches only `parish` and
   `app_user` — it cannot read a register even directly.
2. **Row-level security is enabled in the same migration that creates the table.** RLS
   with no policy denies everything, which is the safe default; a policy arriving in a
   follow-up migration is a window where it does not.
3. **Uniqueness is enforced by catching `23505`, never by checking first.** RLS hides
   other parishes' rows, so a pre-check reports "free" for a value already taken
   elsewhere — and a pre-check is a race regardless.

### Module map

```
server/src/
├── db/            pool.js (patron_app; also the DATE → string type parser)
│                  adminPool.js (patron_admin)
│                  withTenant.js — exports withActor(); the filename is stale
├── lib/           appError, credentials, validators, fileType, verificationCode
├── integrations/  supabaseAuth.js — the only file that talks to Supabase Auth
├── middleware/    errorHandler, notFound
├── modules/       auth/ admin/ users/ parish/ records/ blocks/ events/
│                  documents/ participants/ verification/ announcements/
│                  events/events.issuance.js — Path 2, the whole of it, one txn
└── routes/        health.js
```

`modules/` is organised by feature, each with its own `.router.js`, `.services.js` and
`.queries.js`. The split is testable by grep: **services and queries never mention
`req`/`res`; routers never contain SQL.** A `.public.router.js` suffix marks an
unauthenticated surface.

`admin/` and `users/` look duplicated and are not: `admin/` runs as `patron_admin` with
RLS bypassed, guarded by `requireRole('sysadmin')` and explicit role checks in SQL;
`users/` runs as `patron_app` through `withActor`, so Postgres enforces tenancy.
Likewise **`/api/parish`** (singular) is your own parish and **`/api/parishes`** (plural)
is the public directory.

### API surface

| Mount | Who |
|---|---|
| `/api/health` | public |
| `/api/auth` | public — login, register, recovery; rate-limited |
| `/api/admin` | sysadmin |
| `/api/users` `/api/parish` `/api/records` `/api/blocked-dates` `/api/events` `/api/participants` `/api/documents` `/api/announcements` | staff, scoped by role |
| `/api/requests` `/api/calendar` | parishioners and staff |
| `/api/parishes` `/api/document-types` `/api/feed` `/api/verify` | public, unauthenticated |

Every router applies `requireAuth, requirePasswordChanged, requireRole(…)` at **router
level**, so a route added later inherits the guard instead of relying on someone to
remember it per route.

There are exactly **four public surfaces** — the parish directory, the announcement
feed, the verifier, and `health`. Each of the first three is a view whose **column list
is the security boundary**; the directory is five columns, which is why the public church
page shows no priest's name.

Error codes are the frontend contract and live in `docs/error_codes.md`. Only
`NO_TOKEN`, `INVALID_TOKEN` and `SESSION_REVOKED` end a client session — notably *not*
every 401, because `/api/auth/change-password` answers `INVALID_CREDENTIALS` 401 for a
mistyped *current* password, and signing a priest out for that would strand him on a
temporary password in a loop.

### The frontend

`frontend/` is React + Vite on `HashRouter`, with four role layouts (`Admin`, `Manager`,
`Priest`, `User`) and three shared seams: `lib/api.js` is the single door to the API and
returns `{ ok, status, json }` rather than throwing, `lib/session.js` holds the Bearer
token, and `lib/errors.js` is the one place an error code becomes a sentence. Hash
routing is also what makes the verifier's public path (`/#/verify`) work on a static
host with no rewrite rule.

---

## First login (sysadmin)

The first System Administrator is **seeded by a migration**
(`supabase/migrations/20261018080757_sysadmin_setup.sql`), so a freshly pushed database
already has one:

- **Username:** `sysadmin`
- **Password:** the plaintext whose bcrypt hash that migration holds. Ask a developer if
  you do not have it.

The credential is **public by design** — a seeded account nobody can log into is dead
weight, and its hash is in git history permanently. `must_change_password = true` is the
whole of the protection: the first login is forced straight to a password change.
**Do that before the API is reachable by anyone else.** The seed is
`on conflict (lower(username)) do nothing`, so a database that already has a sysadmin —
one bootstrapped by hand — is left untouched and keeps its own password.

From there the chain is: the sysadmin registers a parish and provisions its **priest**;
the priest provisions his **managers**; parishioners **self-register** and choose no
parish. Every provisioned account is issued a temporary password and forced to change it
at first login, and a password change revokes every token issued before it.

A priest moving parishes is **deactivated at the old parish and provisioned fresh at the
new one** — `parish_id` is never mutated, or the old parish would lose sight of the row
and every historical approval there would render nameless. For the same reason users are
deactivated, **never hard-deleted**: the audit trail is the point.

The sysadmin's *own* password recovery is a hand-written SQL update, by structure — they
have no superior to reset it. See `docs/ops.md`.

---

## The two things worth knowing about the domain

**Rule 1 — event scheduling runs three checks, in order:** parish blocked dates → the
assigned priest's personal unavailability → that priest's own schedule conflicts. Checks
2 and 3 are **priest-scoped**, so two events on one date are fine with different
priests. A conflict **refuses, with no override**. Blocked dates are
*warn-don't-touch*: the warning lists the events already on those days, the block saves,
and the existing events are left alone.

**Rule 2 — verifiable issuance, by two paths.** *Path 1*: a parishioner or a walk-in
requests a certificate against an existing register entry; the office attaches the
entry, a priest approves, the certificate is issued. Attaching the entry **is** the
verification — one statement sets the record and the status together — so a request with
no entry attached can never be approved. *Path 2*: a sacramental event marked complete
writes the register entries for its cleared participants and issues their certificates
in **one transaction**, and the priest is never asked again — his approval of the event
was the approval of the issuance, enforced by an RLS policy rather than promised by a
service. Both paths produce a certificate carrying a verification code and QR; the
certificate PDF is rendered on demand from a field snapshot taken at issuance, and is
never stored.

---

## Documentation map

**`docs/` is untracked on purpose** (excluded via `.git/info/exclude`) and is not in this
clone. `CLAUDE.md` at the root is the standing brief and is tracked; the rest is held by
the developers and handed over directly.

| File | What it is |
|---|---|
| `docs/system_overview.md` | Every feature in one document — start here |
| `docs/api.md` | Every route: path, guard, body, response |
| `docs/error_codes.md` | The frontend contract |
| `docs/decisions.md` | Why each decision went the way it did |
| `docs/ops.md` | Deploying, database setup, sysadmin bootstrap, email |
| `docs/session_log.md` | Build history, newest first |
| `docs/<feature>_summary.md` | Per-step deep dives: `auth`, `provisioning`, `parish`, `records`, `events`, `documents`, `participants`, `path2`, `announcements` |
| `docs/Entities.md` | The manuscript's data dictionary, kept **uncorrected** — not the schema |
| `docs/manuscript_changes.md` | The diff between that dictionary and what was built |

---

## What this does not do

Boundaries that are deliberate, not unfinished:

- **No automated tests.** Verification is by hand, through the frontend, and recorded in
  `docs/session_log.md`. This is the project's largest accepted cost.
- **No payment processing.** A document request carries `is_paid` and `paid_at` — a flag
  that the parish office collected the fee. No amount, no gateway.
- **The Supabase service role key is used nowhere.** Anything that would need it is out
  of scope by definition. This is why a parishioner's `app_user` row is created
  just-in-time at their first successful login rather than at signup: an orphaned
  Supabase user cannot be deleted without that key.
- **A parishioner cannot change their password through this API** —
  `NOT_A_STAFF_ACCOUNT` 403, because Supabase owns it. Recovery by email is the only
  route.
- **No global person identity.** The isolation claim is *staff-scoped*; a parishioner
  belongs to no parish and is a tenant of nothing. Records are never cross-tenant, and
  prerequisite auto-verification reaches only the participant's own sacramental history
  within the target parish — never a parent's or a sponsor's.
- **No PII on any public surface**, announcements included.
- **The one-way Facebook sync is designed but not built** — blocked on a Page access
  token, not on code. Announcements, images and the public feed are complete without it.
- **Express sends no mail.** Certificates are downloaded, never emailed. The only
  outbound email in the system is Supabase's own confirmation and recovery.
- **Record search is plain word-by-word `ILIKE`**, not trigram similarity. `pg_trgm` is
  installed and unused.
- **Nothing is deleted.** Users are deactivated, records are corrected by new entries,
  and an approved announcement is archived and replaced rather than edited.
