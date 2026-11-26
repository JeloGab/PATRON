// The only file that talks to the Graph API.

import 'dotenv/config'

const VERSION = process.env.FACEBOOK_GRAPH_VERSION ?? 'v27.0'
const GRAPH = `https://graph.facebook.com/${VERSION}`

const APP_ID = process.env.FACEBOOK_APP_ID
const APP_SECRET = process.env.FACEBOOK_APP_SECRET
const CONFIG_ID = process.env.FACEBOOK_LOGIN_CONFIG_ID

const CALL_TIMEOUT_MS = 12000
const POST_BUDGET_MS = 45000

const GONE_CODE = 100
const GONE_SUBCODE = 33
const BAD_TOKEN_CODE = 190
const NO_PERMISSION_CODES = [10, 200]
const MAX_POST_PAGES = 6
const POST_PAGE_SIZE = '100'
const PROBE_WINDOW_SECONDS = 900

function signalFor(deadline) {
  const left = deadline - Date.now()
  return AbortSignal.timeout(Math.max(1500, Math.min(CALL_TIMEOUT_MS, left)))
}

function failureOf(payload, status) {
  const e = payload.error ?? {}
  const code = [e.code, e.error_subcode].filter(Boolean).join('/')
  return {
    ok: false,
    status,
    code: e.code ?? null,
    subcode: e.error_subcode ?? null,
    detail: `${status} ${code} ${e.message ?? 'unknown error'}`.trim(),
  }
}

async function graph(path, form, deadline) {
  let res
  try {
    res = await fetch(`${GRAPH}/${path}`, {
      method: 'POST',
      body: form,
      signal: signalFor(deadline),
    })
  } catch (err) {
    return { ok: false, detail: err.name === 'TimeoutError' ? 'timed out' : err.message }
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.error) return failureOf(payload, res.status)
  return { ok: true, payload }
}

async function graphGet(path, params) {
  let res
  try {
    res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`, {
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
  } catch (err) {
    return { ok: false, detail: err.name === 'TimeoutError' ? 'timed out' : err.message }
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.error) return failureOf(payload, res.status)
  return { ok: true, payload }
}

async function uploadPhoto(token, image, deadline) {
  const form = new FormData()
  form.set('access_token', token)
  form.set('published', 'false')
  form.set('source', new Blob([image.content], { type: image.contentType }), image.fileName)

  const r = await graph('me/photos', form, deadline)
  if (!r.ok) return r
  if (!r.payload.id) return { ok: false, detail: 'photo upload returned no id' }
  return { ok: true, mediaFbid: r.payload.id }
}

export async function postAnnouncement({ token, title, content, images = [] }) {
  const deadline = Date.now() + POST_BUDGET_MS

  const attached = []
  for (const image of images) {
    const uploaded = await uploadPhoto(token, image, deadline)
    if (!uploaded.ok) {
      console.error('[facebook] photo upload failed:', uploaded.detail)
      return { ok: false, detail: uploaded.detail }
    }
    attached.push(uploaded.mediaFbid)
  }

  const form = new FormData()
  form.set('access_token', token)
  form.set('message', `${title}\n\n${content}`)
  attached.forEach((mediaFbid, index) => {
    form.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: mediaFbid }))
  })

  const r = await graph('me/feed', form, deadline)
  if (!r.ok) {
    console.error(
      '[facebook] feed post failed:', r.detail,
      `— ${attached.length} unpublished photo(s) left on the page`
    )
    return { ok: false, detail: r.detail }
  }
  if (!r.payload.id) return { ok: false, detail: 'feed post returned no id' }

  return { ok: true, postId: r.payload.id }
}

function readFailure(r) {
  if (r.code === BAD_TOKEN_CODE) return { ok: false, tokenBad: true, detail: r.detail }
  if (NO_PERMISSION_CODES.includes(r.code)) return { ok: false, permission: true, detail: r.detail }
  if (r.code === GONE_CODE && r.subcode === GONE_SUBCODE) {
    return { ok: false, permission: true, detail: r.detail }
  }
  return { ok: false, detail: r.detail }
}

async function graphDelete(path, params) {
  let res
  try {
    res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
  } catch (err) {
    return { ok: false, detail: err.name === 'TimeoutError' ? 'timed out' : err.message }
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.error) return failureOf(payload, res.status)
  return { ok: true, payload }
}

export async function deletePost({ token, postId }) {
  const r = await graphDelete(postId, { access_token: token })
  if (r.ok) return { ok: true }
  if (r.code === GONE_CODE && r.subcode === GONE_SUBCODE) return { ok: true, alreadyGone: true }
  return readFailure(r)
}

export async function findPost({ token, postId, postedAt = null }) {
  const floor = postedAt ? Date.parse(postedAt) - 86400000 : null
  let after = null

  for (let page = 0; page < MAX_POST_PAGES; page += 1) {
    const params = { access_token: token, fields: 'id,created_time', limit: POST_PAGE_SIZE }
    if (after) params.after = after

    const r = await graphGet('me/published_posts', params)
    if (!r.ok) return readFailure(r)

    const rows = r.payload.data ?? []
    if (rows.some((post) => post.id === postId)) return { ok: true, exists: true }

    after = r.payload.paging?.cursors?.after ?? null
    if (rows.length === 0 || !r.payload.paging?.next || !after) return { ok: true, exists: false }

    const oldest = Date.parse(rows[rows.length - 1].created_time ?? '')
    if (floor && Number.isFinite(oldest) && oldest < floor) return { ok: true, exists: false }
  }

  return { ok: false, detail: 'paged the page history without reaching the post asked about' }
}

export async function findRecentPost({ token, needle, windowSeconds = PROBE_WINDOW_SECONDS }) {
  const want = String(needle ?? '').trim()
  if (!want) return { ok: true, postId: null }

  const r = await graphGet('me/published_posts', {
    access_token: token,
    fields: 'id,message,created_time',
    limit: '25',
  })
  if (!r.ok) return { ok: false, detail: r.detail }

  const cutoff = Date.now() - windowSeconds * 1000
  const hit = (r.payload.data ?? []).find((post) => {
    if (!String(post.message ?? '').trim().startsWith(want)) return false
    const made = Date.parse(post.created_time ?? '')
    return !Number.isFinite(made) || made >= cutoff
  })
  return { ok: true, postId: hit?.id ?? null }
}

export function isLoginConfigured() {
  return Boolean(APP_ID && APP_SECRET && CONFIG_ID)
}

export function dialogUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    state,
    config_id: CONFIG_ID,
    response_type: 'code',
  })
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${params}`
}

export async function connectPageFromCode({ code, redirectUri }) {
  const short = await graphGet('oauth/access_token', {
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })
  if (!short.ok) return short

  const long = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: short.payload.access_token,
  })
  if (!long.ok) return long

  const userToken = long.payload.access_token

  const pages = await graphGet('me/accounts', {
    fields: 'id,name,username,access_token',
    access_token: userToken,
  })
  if (!pages.ok) return pages

  const granted = pages.payload.data ?? []
  if (granted.length === 0) return { ok: true, pages: [] }
  if (granted.length > 1) return { ok: true, pages: granted.map((p) => p.name ?? p.id) }

  const page = granted[0]

  const debug = await graphGet('debug_token', {
    input_token: page.access_token,
    access_token: userToken,
  })
  if (!debug.ok) return debug

  const scopes = debug.payload.data?.scopes ?? []
  console.error('[facebook] page token scopes:', scopes.join(', ') || 'none reported')
  if (!scopes.includes('pages_read_engagement')) {
    console.error(
      '[facebook] pages_read_engagement is NOT granted -- posting will work but',
      'reading a post back will fail with Graph code 10, so the removal check cannot run'
    )
  }

  if (debug.payload.data?.expires_at !== 0) {
    return { ok: false, expiring: true, detail: `expires_at=${debug.payload.data?.expires_at}` }
  }

  return {
    ok: true,
    page: {
      pageId: page.username || page.id,
      token: page.access_token,
    },
  }
}
