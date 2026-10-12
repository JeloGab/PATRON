// Supabase Auth sends people back to the app with its tokens in the URL FRAGMENT:
//
//   http://localhost:5173/#access_token=ey...&type=recovery
//   http://localhost:5173/#error=access_denied&error_code=otp_expired&type=recovery
//   http://localhost:5173/#access_token=ey...&type=signup
//
// which collides head-on with HashRouter. Here the fragment IS the route, so
// react-router reads `/access_token=ey...`, matches nothing, falls through to `*`,
// and redirects to /login — throwing the token away before any page can read it.
// The backend is faultless; the feature just looks broken.
//
// `consumeAuthFragment()` therefore runs in main.jsx BEFORE HashRouter mounts: it
// takes whatever Supabase left, stores it, and rewrites the fragment to a real route.
//
// The server never sends `redirect_to` — `requestRecovery` posts only the email — so
// Supabase uses the project's Site URL, which must be this app's root. That is why
// nothing here hardcodes a URL: it rebuilds from the live pathname, whatever root the
// dashboard is set to.
//
// The token is held in sessionStorage, deliberately:
//   out of the URL      so it is not in history, a bookmark, or a Referer header
//   out of module state so a refresh on the reset form does not lose it
//   session, not local  so it dies with the tab and never reaches a second one
//
// Reads are NON-destructive, and the caller clears explicitly. A read-and-remove
// would be emptied by StrictMode's double render in development, and the page would
// then report a perfectly good link as expired.

const TOKEN_KEY = 'patron.recovery.token'
const ERROR_KEY = 'patron.recovery.error'
const CONFIRMED_KEY = 'patron.email.confirmed'

function write(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Private windows and blocked site data throw. Nothing to fall back to: the
    // reset page will say the link could not be read and offer to send another.
  }
}

function read(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function drop(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* nothing stored */
  }
}

// replaceState, not `location.hash = ...`: assigning pushes a history entry, so Back
// would land on the URL that still carries the token.
function replaceHash(route) {
  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}#${route}`)
}

export function consumeAuthFragment() {
  let raw = ''
  try {
    raw = window.location.hash ?? ''
  } catch {
    return
  }
  if (!raw.startsWith('#')) return

  const body = raw.slice(1)
  // A normal route: '', '/login', '/verify/4KPX9QW2TM'. Everything Supabase sends
  // begins with a parameter name, never a slash — that is the whole test.
  if (body === '' || body.startsWith('/')) return

  const params = new URLSearchParams(body)
  const type = params.get('type')
  const token = params.get('access_token')
  const failure =
    params.get('error_description') || params.get('error_code') || params.get('error')

  // An expired or already-used recovery link arrives as an error, not a token. It is
  // the single most likely outcome in testing, since the link is one-shot.
  if (failure) {
    write(ERROR_KEY, failure)
    replaceHash('/reset-password')
    return
  }

  if (type === 'recovery' && token) {
    write(TOKEN_KEY, token)
    replaceHash('/reset-password')
    return
  }

  // Confirming an address signs nobody in: `app_user` is created just-in-time at the
  // first successful login, so the only useful destination is the sign-in form.
  if (type === 'signup' || type === 'email_change' || type === 'magiclink') {
    write(CONFIRMED_KEY, '1')
    replaceHash('/login')
    return
  }

  // An unrecognised fragment that is plainly not a route. Send them somewhere real
  // rather than leaving HashRouter to render the catch-all over a garbled URL.
  if (token || params.has('refresh_token')) replaceHash('/login')
}

export const peekRecoveryToken = () => read(TOKEN_KEY)
export const peekRecoveryError = () => read(ERROR_KEY)
export const peekEmailConfirmed = () => read(CONFIRMED_KEY) === '1'

export function clearRecovery() {
  drop(TOKEN_KEY)
  drop(ERROR_KEY)
}

export const clearEmailConfirmed = () => drop(CONFIRMED_KEY)
