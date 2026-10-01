import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireSubjectName, requireGender, optionalContact, optionalPastDate, optionalSponsorNames, optionalReason } from '../../lib/validators.js'
import { findEvent } from '../events/events.queries.js'
import { findParticipant, findParticipants, insertParticipant, updateParticipant, setParticipantStatus,  materialiseRequirements, findRequirements, findRequirement, updateRequirement,
  findMatchingRecordIds, clearParticipant, } from './participants.queries.js'

const NEEDS_BIRTH_DATE = ['baptism', 'confirmation']
const NEEDS_CONTACT = ['seminar', 'general']
const FINAL_EVENT_STATUSES = ['rejected', 'cancelled', 'completed']
const DECISIONS = ['verified', 'waived']

function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}
function normaliseName(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

async function loadEvent(actor, eventId) {
  const event = await findEvent(actor, eventId)
  if (!event) throw new AppError('EVENT_NOT_FOUND', 404)
  return event
}

async function loadParticipant(actor, participantId) {
  const participant = await findParticipant(actor, participantId)
  if (!participant) throw new AppError('PARTICIPANT_NOT_FOUND', 404)
  return participant
}

function requireRosterOpen(event) {
  if (FINAL_EVENT_STATUSES.includes(event.status)) throw new AppError('EVENT_NOT_EDITABLE', 409)
}

function requireRosterAcceptsAdditions(event) {
  requireRosterOpen(event)
  if (event.eventType === 'sacramental' && event.status === 'approved') {
    throw new AppError('ROSTER_CLOSED', 409)
  }
}

function requireContact(value, event) {
  const contact = optionalContact(value)
  if (!contact && NEEDS_CONTACT.includes(event.eventType)) throw new AppError('INVALID_CONTACT', 400)
  return contact
}

function requireBirthDate(value, event) {
  const dateOfBirth = optionalPastDate(value, 'INVALID_BIRTH_DATE')
  if (dateOfBirth) return dateOfBirth
  if (event.eventType === 'sacramental' && NEEDS_BIRTH_DATE.includes(event.sacramentType)) {
    throw new AppError('INVALID_BIRTH_DATE', 400)
  }
  return null
}

function requireSponsor(value, event) {
  const sponsorName = optionalSponsorNames(value)
  if (sponsorName && event.eventType !== 'sacramental') throw new AppError('SPONSOR_NOT_ALLOWED', 400)
  return sponsorName
}

export async function addParticipant(actor, body) {
  const eventId = requireId(body.eventId, 'INVALID_EVENT_ID')
  const event = await loadEvent(actor, eventId)
  requireRosterAcceptsAdditions(event)

  const participantId = await insertParticipant(actor, {
    eventId,
    participantName: requireSubjectName(body.participantName),
    participantContact: requireContact(body.participantContact, event),
    participantDateOfBirth: requireBirthDate(body.participantDateOfBirth, event),
    gender: requireGender(body.gender),
    sponsorName: requireSponsor(body.sponsorName, event),
  })
  const participant = await findParticipant(actor, participantId)
  await materialiseRequirements(actor, participantId, event.sacramentType)
  await autoVerify(actor, participant)
  await clearParticipant(actor, participantId, event.eventDate)

  return findParticipant(actor, participantId)
  
}

async function autoVerify(actor, participant) { 
  if (!participant.participantDateOfBirth) return

  const requirements = await findRequirements(actor, participant.participantId)
  for (const requirement of requirements) {
    if (requirement.status !== 'pending' || !requirement.autoCheckRecordType) continue

    const matches = await findMatchingRecordIds(actor, {
      recordType: requirement.autoCheckRecordType,
      normalisedName: normaliseName(participant.participantName),
      dateOfBirth: participant.participantDateOfBirth,
    })
    if (matches.length !== 1) continue

    await updateRequirement(actor, requirement.requirementId, {
      status: 'auto_verified',
      matchedRecordId: matches[0],
      notes: null,
      manual: false,
    })
  }
}

export async function listParticipants(actor, query) {
  const eventId = requireId(query.eventId, 'INVALID_EVENT_ID')
  await loadEvent(actor, eventId)
  return findParticipants(actor, eventId)
}

export async function getParticipant(actor, participantId) {
  return loadParticipant(actor, requireId(participantId, 'INVALID_PARTICIPANT_ID'))
}

export async function editParticipant(actor, participantId, body) {
  const id = requireId(participantId, 'INVALID_PARTICIPANT_ID')
  const participant = await loadParticipant(actor, id)
  const event = await loadEvent(actor, participant.eventId)
  requireRosterOpen(event)

  const patch = {}
  if (Object.hasOwn(body, 'participantName')) patch.participantName = requireSubjectName(body.participantName)
  if (Object.hasOwn(body, 'participantContact')) patch.participantContact = requireContact(body.participantContact, event)
  if (Object.hasOwn(body, 'participantDateOfBirth')) patch.participantDateOfBirth = requireBirthDate(body.participantDateOfBirth, event)
  if (Object.hasOwn(body, 'gender')) patch.gender = requireGender(body.gender)
  if (Object.hasOwn(body, 'sponsorName')) patch.sponsorName = requireSponsor(body.sponsorName, event)

  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const rowCount = await updateParticipant(actor, id, patch)
  if (rowCount === 0) throw new AppError('PARTICIPANT_NOT_FOUND', 404)

  return findParticipant(actor, id)
}

export async function withdrawParticipant(actor, participantId) {
  const id = requireId(participantId, 'INVALID_PARTICIPANT_ID')
  const participant = await loadParticipant(actor, id)
  const event = await loadEvent(actor, participant.eventId)
  requireRosterOpen(event)

  if (participant.status === 'withdrawn') throw new AppError('PARTICIPANT_NOT_ACTIVE', 409)

  const rowCount = await setParticipantStatus(actor, id, 'withdrawn')
  if (rowCount === 0) throw new AppError('PARTICIPANT_NOT_FOUND', 404)

  return findParticipant(actor, id)
}

export async function listRequirements(actor, participantId) {
  const id = requireId(participantId, 'INVALID_PARTICIPANT_ID')
  await loadParticipant(actor, id)
  return findRequirements(actor, id)
}

export async function decideRequirement(actor, participantId, requirementId, body) {
  const pid = requireId(participantId, 'INVALID_PARTICIPANT_ID')
  const rid = requireId(requirementId, 'INVALID_REQUIREMENT_ID')

  const participant = await loadParticipant(actor, pid)
  const event = await loadEvent(actor, participant.eventId)
  requireRosterOpen(event)

  const requirement = await findRequirement(actor, rid)
  if (!requirement || requirement.participantId !== pid) throw new AppError('REQUIREMENT_NOT_FOUND', 404)

  const status = clean(body.status).toLowerCase()
  if (!DECISIONS.includes(status)) throw new AppError('INVALID_STATUS', 400)

  let matchedRecordId = null
  if (clean(body.recordId)) {
    if (!requirement.autoCheckRecordType) throw new AppError('RECORD_NOT_APPLICABLE', 409)
    matchedRecordId = requireId(body.recordId, 'INVALID_RECORD_ID')
    const record = await findRecord(actor, matchedRecordId)
    if (!record) throw new AppError('RECORD_NOT_FOUND', 404)
    if (record.recordType !== requirement.autoCheckRecordType) throw new AppError('RECORD_TYPE_MISMATCH', 409)
  }

  const rowCount = await updateRequirement(actor, rid, {status, matchedRecordId, notes: optionalReason(body.notes), manual: true})
  if (rowCount === 0) throw new AppError('REQUIREMENT_NOT_FOUND', 404)

  await clearParticipant(actor, pid, event.eventDate)
  return findRequirements(actor, pid)
}