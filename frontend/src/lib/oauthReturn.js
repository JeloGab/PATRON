// Claims Facebook's ?code= from the query string before HashRouter mounts.

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
