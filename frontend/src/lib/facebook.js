// The four states sync_status can be in, and what each one means to the person reading it.

export const SYNC_LABEL = {
  synced: 'On Facebook',
  failed: 'Not posted',
  skipped: 'No page connected',
  removed: 'Deleted on Facebook',
  none: 'Not posted yet',
}

export const SYNC_HINT = {
  synced:
    'Posted to the parish page. While the Meta app is in development mode the post is visible only to people who hold a role on it — not yet to the public.',
  failed:
    'Facebook refused the post. The announcement is published in PATRON either way. An expired or replaced page token is the usual cause.',
  skipped:
    'Nothing was sent, because this parish has no Facebook page connected. Connect one on the parish profile.',
  removed:
    'The post is no longer on the parish page. Someone deleted it on Facebook. The announcement is still published in PATRON, and it can be posted again.',
  none: 'This announcement was approved before Facebook posting existed. It can be posted now.',
}

const PILL = {
  synced: 'status-pill--confirmed',
  failed: 'status-pill--rejected',
  skipped: 'status-pill--cancelled',
  removed: 'status-pill--rejected',
  none: 'status-pill--cancelled',
}

const STATES = ['synced', 'failed', 'skipped', 'removed']

export function syncStateOf(announcement) {
  const status = announcement?.syncStatus
  return STATES.includes(status) ? status : 'none'
}

export function canCheckFacebook(announcement) {
  if (announcement?.status !== 'approved') return false
  if (!announcement.facebookPostId) return false
  return syncStateOf(announcement) === 'synced' || syncStateOf(announcement) === 'removed'
}

export function checkedLabel(iso) {
  if (!iso) return 'Not checked yet'

  const elapsed = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(elapsed) || elapsed < 60000) return 'Checked just now'

  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 60) return `Checked ${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Checked ${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  return `Checked ${days} day${days === 1 ? '' : 's'} ago`
}

export function syncPill(state) {
  return `status-pill ${PILL[state] ?? ''}`
}

export function postUrl(facebookPostId) {
  const value = String(facebookPostId ?? '')
  const parts = value.split('_')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
}

export function canPostToFacebook(announcement) {
  if (announcement?.status !== 'approved') return false
  return syncStateOf(announcement) !== 'synced'
}
