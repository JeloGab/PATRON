// The single door to the Express API.
//
// Every call returns the same shape, so a page treats success and failure the same
// way:
//
//   { ok, status, json }
//
// It never throws. A server that is down, or a CORS refusal, comes back as
//   { ok: false, status: 0, json: { code: 'NETWORK_ERROR' } }
// because in this API a 403 or a 409 is a normal, designed answer — not an
// exception — and `try/catch` around every call would also swallow real render
// bugs and report them to the user as API errors.
//
// The cost of that choice: every call site must check `if (!r.ok)`. Forgetting to
// renders `undefined` rather than showing the error.

const BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000').replace(/\/$/, '')

// The only three codes that mean the session itself is gone.
//
// A 401 that is NOT one of these is an ordinary failure. `/api/auth/change-password`
// answers INVALID_CREDENTIALS 401 when the *current* password is mistyped — the
// session is perfectly healthy, the user just fumbled a field. Signing them out for
// that would strand a priest halfway through his first sign-in, on a temporary
// password, in a loop. So the rule is these three codes, never "any 401".
const SESSION_CODES = new Set(['NO_TOKEN', 'INVALID_TOKEN', 'SESSION_REVOKED'])

export function isSessionError(result) {
  return !result.ok && SESSION_CODES.has(result.json?.code)
}

// `raw`    — a Blob/File/typed array sent as the body as-is. The caller supplies
//            Content-Type in `headers`; express.raw only parses the types it was
//            told about, so the header decides whether the body arrives at all.
// `as`     — 'blob' reads a successful response as bytes (ledger photos, certificate
//            PDFs). Errors are still JSON, so only a 2xx is read as a blob.
export async function call({
  method = 'GET',
  path,
  token,
  body,
  raw,
  headers: extra,
  as = 'json',
}) {
  const headers = { ...(extra ?? {}) }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    // fetch rejects for a dead server, DNS, or a CORS refusal. The browser does not
    // tell JavaScript which, so the detail is all we can offer.
    return { ok: false, status: 0, json: { code: 'NETWORK_ERROR', detail: err.message } }
  }

  if (as === 'blob' && res.ok) {
    return { ok: true, status: res.status, blob: await res.blob(), json: null }
  }

  let json = null
  try {
    json = await res.json()
  } catch {
    // A 204, or an HTML error page from something in front of Express.
    json = res.ok ? {} : { code: 'REQUEST_FAILED' }
  }

  return { ok: res.ok, status: res.status, json }
}

export default call
