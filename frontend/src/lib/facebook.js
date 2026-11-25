// The four states sync_status can be in, and what each one means to the person reading it.

export const SYNC_LABEL = {
  synced: 'On Facebook',
  failed: 'Not posted',
  skipped: 'No page connected',
  none: 'Not posted yet',
}

// A development-mode app's posts are invisible to a logged-out visitor — verified by
// hand 2026-11-16. Saying so here is the difference between a known platform limit and
// a bug report: without it, a priest opens the post in a logged-out browser, sees
// nothing, and reports that the system is broken.
export const SYNC_HINT = {
  synced:
    'Posted to the parish page. While the Meta app is in development mode the post is visible only to people who hold a role on it — not yet to the public.',
  failed:
    'Facebook refused the post. The announcement is published in PATRON either way. An expired or replaced page token is the usual cause.',
  skipped:
    'Nothing was sent, because this parish has no Facebook page connected. Connect one on the parish profile.',
  none: 'This announcement was approved before Facebook posting existed. It can be posted now.',
}

const PILL = {
  synced: 'status-pill--confirmed',
  failed: 'status-pill--rejected',
  skipped: 'status-pill--cancelled',
  none: 'status-pill--cancelled',
}

// sync_status is null until something attempts a post, so null is a real state and not
// an absence. Every lookup here goes through this so the null never reaches an index.
export function syncStateOf(announcement) {
  const status = announcement?.syncStatus
  return status === 'synced' || status === 'failed' || status === 'skipped' ? status : 'none'
}

export function syncPill(state) {
  return `status-pill ${PILL[state] ?? ''}`
}

// facebook_post_id is `{page-id}_{post-id}`, which is the shape the Graph API returns
// and what the runbook recorded. Anything else is not linkable, so it renders as text.
export function postUrl(facebookPostId) {
  const value = String(facebookPostId ?? '')
  const parts = value.split('_')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
}

// Only an approved announcement can be posted — record_announcement_sync() requires it,
// so offering the button anywhere else would promise something the database refuses.
export function canPostToFacebook(announcement) {
  if (announcement?.status !== 'approved') return false
  return syncStateOf(announcement) !== 'synced'
}
