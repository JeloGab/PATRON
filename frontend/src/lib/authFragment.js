// Claims Supabase's URL-fragment tokens before HashRouter mounts and sees them.

const TOKEN_KEY = 'patron.recovery.token'
const ERROR_KEY = 'patron.recovery.error'
const CONFIRMED_KEY = 'patron.email.confirmed'

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

  if (body === '' || body.startsWith('/')) return

  const params = new URLSearchParams(body)
  const type = params.get('type')
  const token = params.get('access_token')
  const failure =
    params.get('error_description') || params.get('error_code') || params.get('error')

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

  if (type === 'signup' || type === 'email_change' || type === 'magiclink') {
    write(CONFIRMED_KEY, '1')
    replaceHash('/login')
    return
  }

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
