const KEY = 'patron.session'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function homeForRole(role) {
  if (role === 'system_admin') return '/admin'
  if (role === 'priest') return '/priest'
  if (role === 'manager') return '/manager'
  if (role === 'user') return '/user'
  return '/login'
}
