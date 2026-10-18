// The signed-in account in localStorage; landingFor() decides where it belongs.

const KEY = 'patron.session'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken() {
  return getSession()?.token ?? null
}

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
    // Only /api/auth/me reports this, so it is false after a login that did not and is
    // corrected the first time the account page or a layout reads /me. False means the
    // top bar shows the initial, which is the empty state anyway — never a broken image.
    hasPhoto: Boolean(user.hasPhoto),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
  }
  return session
}

export function patchSession(patch) {
  const current = getSession()
  if (!current) return null
  const next = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
  }
  return next
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
  }
}

export function landingFor(session) {
  if (!session?.role) return '/login'
  if (session.mustChangePassword) return '/change-password'
  return homeForRole(session.role)
}

function homeForRole(role) {
  if (role === 'sysadmin') return '/admin'
  if (role === 'priest') return '/priest'
  if (role === 'manager') return '/manager'
  if (role === 'parishioner') return '/user'
  return '/login'
}
