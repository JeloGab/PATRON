// The single door to the Express API: returns { ok, status, json }, never throws.

import { getToken } from './session.js'

export const BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000').replace(/\/$/, '')

const SESSION_CODES = new Set(['NO_TOKEN', 'INVALID_TOKEN', 'SESSION_REVOKED'])

export function isSessionError(result) {
  return !result.ok && SESSION_CODES.has(result.json?.code)
}

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
    return { ok: false, status: 0, json: { code: 'NETWORK_ERROR', detail: err.message } }
  }

  if (as === 'blob' && res.ok) {
    return { ok: true, status: res.status, blob: await res.blob(), json: null }
  }

  let json = null
  try {
    json = await res.json()
  } catch {
    json = res.ok ? {} : { code: 'REQUEST_FAILED' }
  }

  return { ok: res.ok, status: res.status, json }
}

export function authed(options) {
  return call({ ...options, token: getToken() })
}

export default call
