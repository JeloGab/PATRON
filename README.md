# PATRON

Web-based parish management system with **verifiable document issuance**, built for
Catholic parishes. Undergraduate capstone thesis, BSIT, Ateneo de Naga University. Two
developers.

A parish keeps its sacramental registers (baptism, confirmation, marriage, death) in
bound ledgers. When a parishioner needs a certificate for a school, a wedding or a
passport, they travel to the parish office, the staff search the ledgers by hand, and a
certificate is typed and signed. What the parishioner receives is a sheet of paper with a
signature on it, and whoever receives it next has no way to confirm it came from the
parish.

PATRON addresses both halves of that. It moves the registers, the request queue, the
event calendar and the parish's public presence online, and every certificate it issues
carries a **verification code and QR** resolving to a public page that confirms validity
without an account and without exposing the record.

---

## Quick start

### Prerequisites

- **Node 22.x** (`server/package.json` pins `engines.node`)
- A **Supabase project**, used as *managed Postgres only*
- The Supabase CLI, which comes from the root `package.json`; call it as `npx supabase`
- Docker is **not** required. `db push` prints a Docker warning and works without it
- Optionally a **Meta app** and a Facebook Page, if approved announcements are to reach
  that Page. Everything else runs without one

### 1. Install

Three `package.json` files, three installs:

```powershell
npm install              # repo root, the Supabase CLI only
cd server;   npm install
cd ..\frontend; npm install
```

### 2. Build the database

From the repo root:

```powershell
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

That is the whole of it. **Nothing is typed into the SQL editor.** Both database role
passwords (`patron_app`, `patron_admin`) and the first sysadmin account come from
migrations, so a new database needs only `link` and `db push`. The only per-project
values are the project ref, `SUPABASE_URL` and the anon key.

`supabase/migrations/` **is** the schema. Nothing else is.

### 3. Configure the server

Create `server/.env`, which is gitignored. The server will not boot without most of it.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Connection string as **`patron_app`**, transaction pooler, port **6543** |
| `DATABASE_URL_ADMIN` | Same host and pooler, as **`patron_admin`** |
| `JWT_SECRET` | Signing key for the HS256 tokens Express issues itself |
| `JWT_EXPIRATION` | `8h` |
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_ANON_KEY` | The **anon** key. Verify it decodes to `"role":"anon"`. The service role key is used nowhere in this project |
| `CLIENT_ORIGIN` | `http://localhost:5173` |
| `PORT` | Optional, defaults to `4000` |

Both role passwords are set by migrations: `patron_app` at line 4 of
`20260820153548_init_schema.sql`, and `patron_admin` by the `alter role` at the foot of
`20261018080757_sysadmin_setup.sql`. Read them there rather than inventing them. Note
that pushing that second migration to a database which already has a `patron_admin`
**overwrites** its password, so update `server/.env` in the same sitting or every
`/api/admin` call fails with `28P01`.

**`CLIENT_ORIGIN` does two jobs.** It is the CORS allow-list, and it is the origin baked
into the QR code on printed certificates. Changing it invalidates the QR on anything
already printed, so the port is pinned: `frontend/vite.config.js` sets `port: 5173` with
`strictPort: true`.

The frontend reads one optional variable, `VITE_API_BASE`, which defaults to
`http://localhost:4000`, so local development needs no `.env` of its own.

### 4. Facebook Page posting (optional)

An approved announcement can be posted to the parish's Facebook Page. The feature is
inert until it is configured, so this section can be skipped: the announcement feed
inside PATRON works either way.

Four more variables in `server/.env`:

| Variable | What it is |
|---|---|
| `FACEBOOK_APP_ID` | The Meta app's App ID |
| `FACEBOOK_APP_SECRET` | The app's App Secret. Server-side only, and never sent to the browser |
| `FACEBOOK_LOGIN_CONFIG_ID` | The configuration ID from Facebook Login for Business. The configuration itself carries the permissions, which is why there is no scope list anywhere in the code |
| `FACEBOOK_GRAPH_VERSION` | Optional, defaults to `v27.0` |

The first three are required together. With any one of them missing the connect routes
answer `FACEBOOK_LOGIN_UNAVAILABLE` 503 and nothing else in the system changes.

Then, in the Meta app itself:

- Add **Facebook Login for Business**, create a configuration that asks for Page posting,
  and copy its configuration ID.
- Add the `CLIENT_ORIGIN` value to the app's **Valid OAuth Redirect URIs**. The redirect
  target is the frontend, not the API. It relays the one-time code to Express with the
  priest's existing Bearer token, so the feature adds no public route.

The Page access token is **not** an environment variable. Each parish's priest connects
his own Page from the parish profile, and the token is stored on that parish's row where
only a `security definer` function can read it.

**One ceiling worth knowing before any demonstration.** While a Meta app is in
development mode its posts are visible only to accounts holding a role on that app, and
Facebook Login for Business will admit only those accounts. The click path is the real
production one, but a stranger's account needs App Review and Business Verification. So
judge the result by the announcement reaching `synced` inside PATRON, never by opening
the Page in a logged-out browser.

### 5. Two Supabase dashboard settings

Parishioner accounts are owned by Supabase Auth, so two console settings are part of the
configuration:

- **Confirm email: ON.**
- **Site URL: the app root**, for example `http://localhost:5173`. The server
  deliberately sends no `redirect_to`, so the Site URL is where confirmation and recovery
  links land. The frontend runs on `HashRouter` and Supabase returns its tokens in the
  URL fragment, so `lib/authFragment.js` claims them in `main.jsx` before the router
  mounts.

### 6. Run

Two terminals. **Run the API from `server/`, never the repo root.** `dotenv` reads `.env`
from the working directory, and from the root `auth.token.js` throws
`JWT_SECRET is not defined`.

```powershell
cd server;   npx nodemon src/index.js     # API on :4000
cd frontend; npm run dev                  # app on http://localhost:5173
```

Open **`localhost`**, not `127.0.0.1`, because CORS is pinned to that exact origin.

### 7. Verify

```powershell
curl.exe http://localhost:4000/api/health
```

A healthy install answers `ok: true` with **`connected_as: "patron_app"`** and
`trgm_installed: true`. `connected_as` naming anything else, `postgres` above all, is the
one failure worth catching immediately: table owners are exempt from row-level security,
so the tenant isolation this system rests on would be silently off.

> **Windows note.** This is a PowerShell project. Heredocs do not work, so use
> `@'...'@` piped to `Set-Content`; `curl` is not `curl.exe`; and backslash-escaped JSON
> is bash syntax, which PowerShell truncates. For request bodies use `Invoke-RestMethod`
> with a single-quoted `-Body`.

---

## Architecture

| Layer | Choice |
|---|---|
| Database | PostgreSQL on Supabase, as **managed Postgres only**, with no `supabase-js` for data, no PostgREST and no Edge Functions |
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
   `WHERE parish_id` in application SQL, because Postgres filters it. A bare `pool.query`
   for tenant data works, returns rows, and returns *every parish's* rows, so it is
   reserved for non-tenant tables, the `security definer` login lookups, and the public
   views. Sysadmin work uses a second pool, `adminPool`, which reaches only `parish` and
   `app_user`, so it cannot read a register even directly.
2. **Row-level security is enabled in the same migration that creates the table.** RLS
   with no policy denies everything, which is the safe default. A policy arriving in a
   follow-up migration is a window where it does not.
3. **Uniqueness is enforced by catching `23505`, never by checking first.** RLS hides
   other parishes' rows, so a pre-check reports "free" for a value already taken
   elsewhere, and a pre-check is a race regardless.

### Module map

```
server/src/
├── db/            pool.js (patron_app; also the DATE to string type parser)
│                  adminPool.js (patron_admin)
│                  withTenant.js, exports withActor(); the filename is stale
├── lib/           appError, credentials, validators, fileType, verificationCode
├── integrations/  supabaseAuth.js, the only file that talks to Supabase Auth
│                  facebook.js, the only file that talks to the Graph API
├── middleware/    errorHandler, notFound
├── modules/       auth/ admin/ users/ parish/ records/ blocks/ events/
│                  documents/ participants/ verification/ announcements/
│                  events/events.issuance.js, Path 2, the whole of it, one txn
│                  events/events.calendar.router.js, the parishioner calendar
└── routes/        health.js
```

`modules/` is organised by feature, each with its own `.router.js`, `.services.js` and
`.queries.js`. The split is testable by grep: **services and queries never mention
`req`/`res`; routers never contain SQL.** A `.public.router.js` suffix marks an
unauthenticated surface.

`admin/` and `users/` look duplicated and are not. `admin/` runs as `patron_admin` with
RLS bypassed, guarded by `requireRole('sysadmin')` and explicit role checks in SQL, while
`users/` runs as `patron_app` through `withActor`, so Postgres enforces tenancy.
Likewise **`/api/parish`** (singular) is your own parish and **`/api/parishes`** (plural)
is the public directory.

### API surface

| Mount | Who |
|---|---|
| `/api/health` | public |
| `/api/auth` | public: login, register, recovery; rate-limited |
| `/api/admin` | sysadmin |
| `/api/users` `/api/parish` `/api/records` `/api/blocked-dates` `/api/events` `/api/participants` `/api/documents` `/api/announcements` | staff, scoped by role |
| `/api/requests` `/api/calendar` | parishioners and staff |
| `/api/parishes` `/api/document-types` `/api/feed` `/api/verify` | public, unauthenticated |

Every router applies `requireAuth, requirePasswordChanged, requireRole(…)` at **router
level**, so a route added later inherits the guard instead of relying on someone to
remember it per route.

Each unauthenticated surface is a view whose **column list is the security boundary**:
the parish directory and its clergy, the parish photograph, the parish seal, the photo
gallery, a priest's photograph, the announcement feed, an announcement image, the
verifier, and the seeded document-type list. Any route answering with image bytes must
also set `Cross-Origin-Resource-Policy: cross-origin`, or `helmet()` makes the browser
refuse to render the image while still returning 200.

Error codes are the frontend contract. Only `NO_TOKEN`, `INVALID_TOKEN` and
`SESSION_REVOKED` end a client session, and notably *not* every 401, because
`/api/auth/change-password` answers `INVALID_CREDENTIALS` 401 for a mistyped *current*
password, and signing a priest out for that would strand him on a temporary password in a
loop. Branch on the code, never on the status.

### The frontend

`frontend/` is React + Vite on `HashRouter`, with four role layouts (`Admin`, `Manager`,
`Priest`, `User`) and three shared seams: `lib/api.js` is the single door to the API and
returns `{ ok, status, json }` rather than throwing, `lib/session.js` holds the Bearer
token, and `lib/errors.js` is the one place an error code becomes a sentence. Hash
routing is also what makes the verifier's public path (`/#/verify`) work on a static host
with no rewrite rule.

---

## First login (sysadmin)

The first System Administrator is **seeded by a migration**
(`supabase/migrations/20261018080757_sysadmin_setup.sql`), so a freshly pushed database
already has one:

- **Username:** `sysadmin`
- **Password:** the plaintext whose bcrypt hash that migration holds. Ask a developer if
  you do not have it.

The credential is **public by design**, because a seeded account nobody can log into is
dead weight, and its hash is in git history permanently. `must_change_password = true` is
the whole of the protection: the first login is forced straight to a password change.
**Do that before the API is reachable by anyone else.** The seed is
`on conflict (lower(username)) do nothing`, so a database that already has a sysadmin,
one bootstrapped by hand, is left untouched and keeps its own password.

From there the chain is: the sysadmin registers a parish and provisions its **priest**;
the priest provisions his **managers**; parishioners **self-register** and choose no
parish. Every provisioned account is issued a temporary password and forced to change it
at first login, and a password change revokes every token issued before it.

A priest moving parishes is **deactivated at the old parish and provisioned fresh at the
new one**. `parish_id` is never mutated, or the old parish would lose sight of the row and
every historical approval there would render nameless. For the same reason users are
deactivated, **never hard-deleted**: the audit trail is the point.

The sysadmin's *own* password recovery is a hand-written SQL update, by structure, since
they have no superior to reset it.

---

## The two things worth knowing about the domain

**Rule 1, event scheduling runs three checks, in order:** parish blocked dates, then the
assigned priest's personal unavailability, then that priest's own schedule conflicts.
Checks 2 and 3 are **priest-scoped**, so two events on one date are fine with different
priests. A conflict **refuses, with no override**. Blocked dates are *warn-don't-touch*:
the warning lists the events already on those days, the block saves, and the existing
events are left alone.

**Rule 2, verifiable issuance by two paths.** *Path 1*: a parishioner or a walk-in
requests a certificate against an existing register entry, the office attaches the entry,
a priest approves, and the certificate is issued. Attaching the entry **is** the
verification, since one statement sets the record and the status together, so a request
with no entry attached can never be approved. *Path 2*: a sacramental event marked
complete writes the register entries for its cleared participants and issues their
certificates in **one transaction**, and the priest is never asked again, because his
approval of the event was the approval of the issuance, enforced by an RLS policy rather
than promised by a service. Both paths produce a certificate carrying a verification code
and QR. The certificate PDF is rendered on demand from a field snapshot taken at
issuance, and is never stored.
