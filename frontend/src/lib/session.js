const KEY = 'patron.user'

export function getSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(user) {
  sessionStorage.setItem(KEY, JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem(KEY)
}
