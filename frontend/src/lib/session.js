// The signed-in account, held in localStorage.
//
// localStorage rather than sessionStorage so a refresh does not sign anyone out —
// a manager halfway through a roster should survive F5 — and Bearer rather than an
// httpOnly cookie because Bearer works in every deployment topology, and ours is
// still undecided.
//
// The exposure is accepted, not solved: anything that can run JavaScript on this
// origin can read the token. What limits the damage is server-side — `requireAuth`
// re-reads the database on every request, so a stolen token still dies the moment
// the account is deactivated, the password changes, or the token predates
// `password_changed_at`. React escapes by default and there is no
// `dangerouslySetInnerHTML` anywhere in this app; that is a property to keep.
//
// The stored object is deliberately FLAT — `name`, `email` and `role` at the top
// level — because TopNav and the four layouts already read it that way. The server
// calls it `fullName`; it is mapped to `name` here, once, rather than at every
// call site.

const KEY = 'patron.session'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Private windows and blocked site data both throw rather than return null.
    return null
  }
}

export function getToken() {
  return getSession()?.token ?? null
}

// `user` is the object the login routes return:
//   { userId, fullName, username, role, parishId, mustChangePassword }
// A parishioner has an email instead of a username.
export function setSession({ token, user }) {
  const session = {
    token,
    userId: user.userId,
    name: user.fullName ?? '',
    email: user.email ?? '',
    username: user.username ?? '',
    role: user.role,
    parishId: user.parishId ?? null,
    mustChangePassword: Boolean(user.mustChangePassword),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Nothing to do — the caller navigates anyway, and the next guarded route will
    // bounce to /login rather than show a half-signed-in app.
  }
  return session
}

// Merge fields into the stored session.
//
// `POST /api/auth/change-password` answers with a fresh token and NOTHING else — no
// user object — so there is nothing to rebuild a session from. The new token has to
// replace the stored one while every other field survives, because changing the
// password revokes every older token: keep the old one and the very next request is
// SESSION_REVOKED, throwing the user to login immediately after succeeding.
export function patchSession(patch) {
  const current = getSession()
  if (!current) return null
  const next = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* in memory for this visit only */
  }
  return next
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

// Where a signed-in account belongs right now.
//
// This exists because the rule was written twice and the two copies disagreed: the
// login handler routed a temporary-password account to /change-password, while
// Login's own "already signed in" redirect sent the same account to its role home,
// where every route answers PASSWORD_CHANGE_REQUIRED 403. Whichever render won
// decided the outcome. One function, called from every redirect, so they cannot
// drift again.
export function landingFor(session) {
  if (!session?.role) return '/login'
  if (session.mustChangePassword) return '/change-password'
  return homeForRole(session.role)
}

// The server's role values, not display names. `sysadmin` and `parishioner` are
// what `app_user.role` holds and what both login routes return; the frontend used
// to say `system_admin` and `user`, which meant a successful login bounced straight
// back to /login and read as a failure.
export function homeForRole(role) {
  if (role === 'sysadmin') return '/admin'
  if (role === 'priest') return '/priest'
  if (role === 'manager') return '/manager'
  if (role === 'parishioner') return '/user'
  return '/login'
}
