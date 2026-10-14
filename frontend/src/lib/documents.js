// Shared vocabulary for document requests: statuses, relationships, formatters.

export const STATUSES = ['pending', 'verified', 'approved', 'rejected', 'cancelled']

export const STATUS_LABEL = {
  pending: 'Pending',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const STATUS_HINT = {
  pending: 'Received. The parish office has not attached a register entry yet.',
  verified: 'A register entry is attached. Waiting for a priest to approve the issuance.',
  approved: 'Approved and issued. The certificate carries a verification code and QR.',
  rejected: 'Refused by the parish.',
  cancelled: 'Withdrawn by the requestor while it was still pending.',
}

export const RELATIONSHIPS = [
  { value: 'self', label: 'Myself' },
  { value: 'parent', label: 'My child' },
  { value: 'child', label: 'My parent' },
  { value: 'spouse', label: 'My spouse' },
  { value: 'sibling', label: 'My sibling' },
  { value: 'other', label: 'Someone else' },
]

export const RELATIONSHIP_LABEL = {
  self: 'The requestor themselves',
  parent: 'Requestor is the parent',
  child: 'Requestor is the child',
  spouse: 'Requestor is the spouse',
  sibling: 'Requestor is the sibling',
  other: 'Other relationship',
}

export const RECORD_TYPE_LABEL = {
  baptism: 'Baptism',
  confirmation: 'Confirmation',
  marriage: 'Marriage',
  death: 'Death',
}

export const EARLIEST_SACRAMENT_YEAR = 1800

export const LIMITS = {
  subjectName: { min: 2, max: 100 },
  purpose: { min: 3, max: 200 },
}

export function statusPill(status) {
  return `status-pill status-pill--${status}`
}

export function formatStamp(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function registryOf(request) {
  if (!request?.recordId) return null
  return `Book ${request.bookNo}, page ${request.pageNo}, entry ${request.entryNo}`
}
