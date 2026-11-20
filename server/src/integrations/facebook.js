// The only file that talks to the Graph API.

import 'dotenv/config'

const VERSION = process.env.FACEBOOK_GRAPH_VERSION ?? 'v27.0'
const GRAPH = `https://graph.facebook.com/${VERSION}`

const APP_ID = process.env.FACEBOOK_APP_ID
const APP_SECRET = process.env.FACEBOOK_APP_SECRET
const CONFIG_ID = process.env.FACEBOOK_LOGIN_CONFIG_ID

const CALL_TIMEOUT_MS = 12000
const POST_BUDGET_MS = 45000

function signalFor(deadline) {
  const left = deadline - Date.now()
  return AbortSignal.timeout(Math.max(1500, Math.min(CALL_TIMEOUT_MS, left)))
}

function failureOf(payload, status) {
  const e = payload.error ?? {}
  const code = [e.code, e.error_subcode].filter(Boolean).join('/')
  return { ok: false, detail: `${status} ${code} ${e.message ?? 'unknown error'}`.trim() }
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

// published=false is the whole reason this step exists. An ordinary photo upload
// appears on the page as its own post immediately, so four images would publish four
// posts and then a fifth carrying the text. Unpublished photos are invisible until a
// /feed call attaches them.
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

// `me` is the PAGE here, not the person: with a page access token selected, me/feed is
// the page's feed. Proven by hand 2026-11-16, where POST {page-id}/feed failed with
// `Unknown path components` (code 2500) and me/feed succeeded. Do not "fix" this by
// putting the page id back in the path.
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

export function isLoginConfigured() {
  return Boolean(APP_ID && APP_SECRET && CONFIG_ID)
}

// With Facebook Login for Business the configuration carries the permissions, so
// config_id replaces the scope list. See docs/facebook_login_change.md §0.
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

// Step 2 is not optional: a page token inherits the lifetime of the user token it came
// from, so without the long-lived exchange the page token expires within the hour and
// every announcement starts recording 'failed' days later with nothing naming the
// cause. me/accounts is a User-node edge and works only with a user token - handed a
// page token it answers (#100) nonexisting field (accounts).
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
