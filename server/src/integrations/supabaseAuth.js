import 'dotenv/config'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY is not defined in .env')
}

async function call(path, body) {
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, payload }
}

export function signUp({ email, password, fullName }) {
  return call('signup', { email, password, data: { full_name: fullName } })
}

export function signInWithPassword({ email, password }) {
  return call('token?grant_type=password', { email, password })
}

export function requestRecovery({ email }) {
  return call('recover', { email })
}

async function callWithToken(path, method, accessToken, body) {
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, payload }
}

export function updatePassword({ accessToken, password }) {
  return callWithToken('user', 'PUT', accessToken, { password })
}