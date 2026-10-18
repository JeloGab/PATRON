// Announcement vocabulary and the four rules that decide what a page may offer.

export const STATUSES = ['pending', 'approved', 'rejected', 'archived']

export const STATUS_LABEL = {
  pending: 'For approval',
  approved: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
}

export const STATUS_HINT = {
  pending: 'Waiting for a priest. Not visible to anyone outside the parish office yet.',
  approved: 'Published on the public feed. Approved is final — it can only be archived.',
  rejected: 'Refused by the priest. It can be edited and resubmitted, or archived.',
  archived: 'Withdrawn from the feed. Kept for the record and never edited again.',
}

const PILL = {
  pending: 'status-pill--pending',
  approved: 'status-pill--approved',
  rejected: 'status-pill--rejected',
  archived: 'status-pill--cancelled',
}

export function statusPill(status) {
  return `status-pill ${PILL[status] ?? ''}`
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png'
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGES = 4

// Editing and attaching an image are both only legal while pending or rejected.
// Approved is final: a correction is an archive plus a new announcement, never an edit.
export function isOpen(announcement) {
  return announcement?.status === 'pending' || announcement?.status === 'rejected'
}

// Archiving is allowed from different statuses by role: a priest archives what he
// approved, the office archives what has not been published.
export function canArchive(announcement, role) {
  if (!announcement) return false
  if (role === 'priest') return announcement.status === 'approved'
  return announcement.status === 'pending' || announcement.status === 'rejected'
}
