// Claims Facebook's ?code= from the query string before HashRouter mounts.
// The sibling of authFragment.js, and it keeps that file's three rules:
//   1. claim before the router mounts, or the route wins and the parameters are lost;
//   2. reads are NON-DESTRUCTIVE — StrictMode renders twice, and a read-and-clear
//      hands the second render nothing;
//   3. every sessionStorage access is wrapped, because a private window throws.
// Easier than the Supabase case: ?code= sits in the query string, before the hash, so it
// never collides with the route.

import { getSession } from './session.js'

const CODE_KEY = 'patron.facebook.code'
const STATE_KEY = 'patron.facebook.state'
const ERROR_KEY = 'patron.facebook.error'

function write(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
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
  }
}

// Strips the query string and lands on the profile, keeping the path. The parish profile
// is two different routes to the same page, so the role decides which — and a visitor
// with no session goes to login, where the stash survives until they reach the profile.
function landOnProfile() {
  const role = getSession()?.role
  const route = role === 'priest' || role === 'manager' ? `/${role}/parish` : '/login'
  window.history.replaceState(null, '', `${window.location.pathname}#${route}`)
}

export function consumeOauthReturn() {
  let search = ''
  try {
    search = window.location.search ?? ''
  } catch {
    return
  }
  if (search.length < 2) return

  const params = new URLSearchParams(search)
  const code = params.get('code')

  // Facebook sends error_reason=user_denied when the priest presses Cancel. That is not
  // a failure to report as one, but the profile should still say the connection did not
  // happen rather than silently looking unchanged.
  const failure =
    params.get('error_description') || params.get('error_reason') || params.get('error')

  if (!code && !failure) return

  if (failure) {
    write(ERROR_KEY, failure)
    landOnProfile()
    return
  }

  write(CODE_KEY, code)
  write(STATE_KEY, params.get('state') ?? '')
  landOnProfile()
}

export function peekFacebookReturn() {
  const code = read(CODE_KEY)
  const error = read(ERROR_KEY)
  if (!code && !error) return null
  return { code, state: read(STATE_KEY) ?? '', error }
}

export function clearFacebookReturn() {
  drop(CODE_KEY)
  drop(STATE_KEY)
  drop(ERROR_KEY)
}
