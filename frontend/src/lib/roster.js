// Roster vocabulary; three requirement statuses mean satisfied, not one.

export const PARTICIPANT_STATUS_LABEL = {
  pending: 'Requirements pending',
  cleared: 'Cleared',
  withdrawn: 'Withdrawn',
}

export const PARTICIPANT_STATUS_HINT = {
  pending:
    'Not every requirement is satisfied yet. Completing the event will skip this person and record nothing for them.',
  cleared: 'Every requirement is satisfied. This person will be written into the register.',
  withdrawn: 'Withdrawn from the roster. Nothing will be recorded.',
}

const PARTICIPANT_PILL = {
  pending: 'status-pill--pending',
  cleared: 'status-pill--approved',
  withdrawn: 'status-pill--cancelled',
}

export function participantPill(status) {
  return `status-pill ${PARTICIPANT_PILL[status] ?? ''}`
}

export const REQUIREMENT_STATUS_LABEL = {
  pending: 'Pending',
  verified: 'Verified',
  auto_verified: 'Auto-verified',
  waived: 'Waived',
}

const REQUIREMENT_PILL = {
  pending: 'status-pill--pending',
  verified: 'status-pill--approved',
  auto_verified: 'status-pill--approved',
  waived: 'status-pill--done',
}

export function requirementPill(status) {
  return `status-pill ${REQUIREMENT_PILL[status] ?? ''}`
}

const SATISFIED = new Set(['verified', 'auto_verified', 'waived'])

export function isSatisfied(requirement) {
  return SATISFIED.has(requirement.status)
}

export function pendingCount(requirements) {
  return requirements.filter((item) => !isSatisfied(item)).length
}

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const NEEDS_BIRTH_DATE = ['baptism', 'confirmation']
const NEEDS_CONTACT = ['seminar', 'general']

export function fieldRules(event) {
  if (!event) return { birthDate: false, contact: false, sponsor: false, parents: false }
  return {
    birthDate: event.eventType === 'sacramental' && NEEDS_BIRTH_DATE.includes(event.sacramentType),
    contact: NEEDS_CONTACT.includes(event.eventType),
    sponsor: event.eventType === 'sacramental',
    parents: event.eventType === 'sacramental',
  }
}

export const MARRIAGE_ROSTER = 2

const FIXED_ROSTER = { marriage: MARRIAGE_ROSTER }

export function rosterLimit(event) {
  if (event?.eventType !== 'sacramental') return null
  return FIXED_ROSTER[event.sacramentType] ?? null
}

export function activeParticipants(participants) {
  return (participants ?? []).filter((person) => person.status !== 'withdrawn')
}

export function withdrawnParticipants(participants) {
  return (participants ?? []).filter((person) => person.status === 'withdrawn')
}

export function rosterIsFull(event, participants) {
  const limit = rosterLimit(event)
  if (limit === null) return false
  return activeParticipants(participants).length >= limit
}

export function rosterAcceptsAdditions(event, participants) {
  if (!event) return false
  if (['rejected', 'cancelled', 'completed'].includes(event.status)) return false
  if (event.eventType === 'sacramental' && event.status === 'approved') return false
  return !rosterIsFull(event, participants)
}

export function rosterIsOpen(event) {
  if (!event) return false
  return !['rejected', 'cancelled', 'completed'].includes(event.status)
}

export function marriageWarning(event, participants) {
  if (event?.sacramentType !== 'marriage') return null
  const cleared = participants.filter((person) => person.status === 'cleared')
  if (cleared.length === 2 && new Set(cleared.map((p) => p.gender)).size === 2) return null
  if (cleared.length === 0) return 'No cleared participant yet. A marriage needs exactly two.'
  if (cleared.length !== 2) {
    return `A marriage needs exactly two cleared participants — there ${cleared.length === 1 ? 'is 1' : `are ${cleared.length}`}. No record will be generated.`
  }
  return 'The two cleared participants must be one male and one female, or no record will be generated.'
}
