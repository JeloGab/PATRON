import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireEventType, requireSacramentType, requireTitle, optionalDescription, requireIsoDate, requireUpcomingDate, requireTime, optionalReason, todayInParish, requireRegistryPart, optionalSubjectName, optionalPlaceOfBirth, optionalPastDate } from '../../lib/validators.js'
import { findActivePriest } from '../parish/parish.queries.js'
import { mintVerificationCode } from '../../lib/verificationCode.js'
import { buildSnapshot, renderCertificatePdf } from '../documents/documents.services.js'
import { findEventCertificates, findEventCertificate } from '../documents/documents.queries.js'
import { roleFor, checkDates } from '../records/records.services.js'
import { findEvent, findEvents, insertEvent, updateEvent, decideEvent, closeEvent, findBlockConflict, findScheduleConflict } from './events.queries.js'
import { findUnclearedParticipants } from '../participants/participants.queries.js'
import {completeEventAndIssue} from './events.issuance.js'
const MAX_WINDOW_DAYS = 92
const EDITABLE_STATUSES = ['pending', 'approved']
const RESCHEDULE_FIELDS = ['eventDate', 'startTime', 'endTime', 'assignedPriestId']
const MAX_ISSUE_ATTEMPTS = 5
const MARRIAGE_ROSTER = 2
const NO_DETAIL = { fatherName: null, motherName: null, placeOfBirth: null, dateOfDeath: null }

function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}

function spanInDays(from, to) {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  return (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000 + 1
}

async function requirePriest(actor, value) {
  const priestId = await findActivePriest(actor, requireId(value, 'INVALID_PRIEST'))
  if (!priestId) throw new AppError('INVALID_PRIEST', 400)
  return priestId
}

function requireDetails(input) {
  if (input === undefined || input === null) return new Map()
  if (!Array.isArray(input)) throw new AppError('INVALID_PARTICIPANT_DETAILS', 400)

  const details = new Map()
  for (const raw of input) {
    const entry = raw ?? {}
    details.set(requireId(entry.participantId, 'INVALID_PARTICIPANT_ID'), {
      fatherName: optionalSubjectName(entry.fatherName),
      motherName: optionalSubjectName(entry.motherName),
      placeOfBirth: optionalPlaceOfBirth(entry.placeOfBirth),
      dateOfDeath: optionalPastDate(entry.dateOfDeath, 'INVALID_DEATH_DATE'),
    })
  }
  return details
}

function subjectFor(participant, detail, recordType) {
  return {
    role: roleFor(recordType, participant.gender),
    fullName: participant.participantName,
    dateOfBirth: participant.dateOfBirth,
    placeOfBirth: detail.placeOfBirth,
    gender: participant.gender,
    fatherName: detail.fatherName,
    motherName: detail.motherName,
    sponsorNames: participant.sponsorName,
  }
}

function rejection(who, err) {
  if (!(err instanceof AppError)) throw err
  return `${who}: ${err.code} — no record was generated`
}

function skipped(person) {
  const detail =
    person.pendingCount > 0
      ? `${person.pendingCount} requirement${person.pendingCount === 1 ? '' : 's'} still pending`
      : 'requirements not cleared'
  return `${person.participantName}: ${detail} — no record or certificate was generated`
}

function planRecords({ recordType, eventDate, officiantName, registry, details, roster }) {
  const drafts = []
  const warnings = []

  if (roster.length === 0) {
    warnings.push('The roster is empty — no record was generated')
    return { drafts, warnings }
  }

  const cleared = []
  for (const person of roster) {
    if (person.status === 'cleared') cleared.push(person)
    else warnings.push(skipped(person))
  }
  if (cleared.length === 0) return { drafts, warnings }

  const base = {
    bookNo: registry.bookNo,
    pageNo: registry.pageNo,
    recordDate: eventDate,
    dateOfDeath: null,
    officiantName,
  }

  if (recordType === 'marriage') {
    if (cleared.length !== MARRIAGE_ROSTER) {
      warnings.push(
        `A marriage register entry is one record with two subjects, so exactly two cleared participants are needed — this roster has ${cleared.length} — no record was generated`
      )
      return { drafts, warnings }
    }

    const subjects = cleared.map((p) =>
      subjectFor(p, details.get(p.participantId) ?? NO_DETAIL, recordType)
    )
    if (subjects[0].role === subjects[1].role) {
      warnings.push('A marriage needs one male and one female participant — no record was generated')
      return { drafts, warnings }
    }

    try {
      checkDates(recordType, base, subjects)
      drafts.push({ record: base, subjects })
    } catch (err) {
      warnings.push(rejection(cleared.map((p) => p.participantName).join(' & '), err))
    }
    return { drafts, warnings }
  }

  for (const participant of cleared) {
    const detail = details.get(participant.participantId) ?? NO_DETAIL
    const record = { ...base, dateOfDeath: recordType === 'death' ? detail.dateOfDeath : null }
    const subjects = [subjectFor(participant, detail, recordType)]

    try {
      checkDates(recordType, record, subjects)
      drafts.push({ record, subjects })
    } catch (err) {
      warnings.push(rejection(participant.participantName, err))
    }
  }

  return { drafts, warnings }

}

async function runChecks(actor, slot) {
  const blocked = await findBlockConflict(actor, slot)
  if (blocked === 'parish') throw new AppError('DATE_BLOCKED', 409)
  if (blocked === 'priest') throw new AppError('PRIEST_UNAVAILABLE', 409)
  if (!slot.priestId) return

  const clash = await findScheduleConflict(actor, slot)
  if (clash) throw new AppError('PRIEST_SCHEDULE_CONFLICT', 409)
}

function requireSlotTimes(startTime, endTime) {
  if (startTime >= endTime) throw new AppError('INVALID_TIME_RANGE', 400)
}

export async function createEvent(actor, body) {
  const eventType = requireEventType(body.eventType)
  const sacramental = eventType === 'sacramental'

  const event = {
    eventType,
    sacramentType: sacramental ? requireSacramentType(body.sacramentType) : null,
    title: requireTitle(body.title),
    description: optionalDescription(body.description),
    eventDate: requireUpcomingDate(body.eventDate, 'INVALID_EVENT_DATE'),
    startTime: requireTime(body.startTime, 'INVALID_TIME_RANGE'),
    endTime: requireTime(body.endTime, 'INVALID_TIME_RANGE'),
    assignedPriestId: null,
    status: sacramental ? 'pending' : 'approved',
    approvedBy: sacramental ? null : actor.userId,
  }
  requireSlotTimes(event.startTime, event.endTime)

  if (sacramental) event.assignedPriestId = await requirePriest(actor, body.assignedPriestId)
  else if (clean(body.assignedPriestId)) event.assignedPriestId = await requirePriest(actor, body.assignedPriestId)

  await runChecks(actor, {
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    priestId: event.assignedPriestId,
    excludeEventId: null,
  })

  const eventId = await insertEvent(actor, event)
  return findEvent(actor, eventId)
}

export async function listEvents(actor, query) {
  const from = requireIsoDate(query.from, 'INVALID_DATE_RANGE')
  const to = requireIsoDate(query.to, 'INVALID_DATE_RANGE')
  if (to < from) throw new AppError('INVALID_DATE_RANGE', 400)
  if (spanInDays(from, to) > MAX_WINDOW_DAYS) throw new AppError('INVALID_DATE_RANGE', 400)

  return findEvents(actor, { from, to })
}

export async function getEvent(actor, eventId) {
  const event = await findEvent(actor, requireId(eventId, 'INVALID_EVENT_ID'))
  if (!event) throw new AppError('EVENT_NOT_FOUND', 404)
  return event
}

export async function editEvent(actor, eventId, body) {
  const current = await getEvent(actor, eventId)
  if (!EDITABLE_STATUSES.includes(current.status)) throw new AppError('EVENT_NOT_EDITABLE', 409)

  const patch = {}
  if (body.title !== undefined) patch.title = requireTitle(body.title)
  if (body.description !== undefined) patch.description = optionalDescription(body.description)
  if (body.eventDate !== undefined) patch.eventDate = requireUpcomingDate(body.eventDate, 'INVALID_EVENT_DATE')
  if (body.startTime !== undefined) patch.startTime = requireTime(body.startTime, 'INVALID_TIME_RANGE')
  if (body.endTime !== undefined) patch.endTime = requireTime(body.endTime, 'INVALID_TIME_RANGE')

  if (body.assignedPriestId !== undefined) {
    if (current.eventType === 'sacramental' || clean(body.assignedPriestId)) {
      patch.assignedPriestId = await requirePriest(actor, body.assignedPriestId)
    } else {
      patch.assignedPriestId = null
    }
  }

  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const next = { ...current, ...patch }
  requireSlotTimes(next.startTime, next.endTime)

  const rescheduled = RESCHEDULE_FIELDS.some(
    (field) => Object.hasOwn(patch, field) && patch[field] !== current[field]
  )

  if (rescheduled) {
    await runChecks(actor, {
      eventDate: next.eventDate,
      startTime: next.startTime,
      endTime: next.endTime,
      priestId: next.assignedPriestId,
      excludeEventId: current.eventId,
    })
  }

  const resetApproval = rescheduled && next.eventType === 'sacramental' && current.status === 'approved'

  const changed = await updateEvent(actor, current.eventId, { patch, resetApproval })
  if (!changed) throw new AppError('EVENT_NOT_FOUND', 404)

  return findEvent(actor, current.eventId)
}

export async function approveEvent(actor, eventId) {
  const current = await getEvent(actor, eventId)
  if (current.status !== 'pending') throw new AppError('EVENT_NOT_PENDING', 409)

  await runChecks(actor, {
    eventDate: current.eventDate,
    startTime: current.startTime,
    endTime: current.endTime,
    priestId: current.assignedPriestId,
    excludeEventId: current.eventId,
  })

  const decided = await decideEvent(actor, current.eventId, { status: 'approved', reason: null })
  if (!decided) throw new AppError('EVENT_NOT_PENDING', 409)

  return findEvent(actor, current.eventId)
}

export async function rejectEvent(actor, eventId, body) {
  const current = await getEvent(actor, eventId)
  if (current.status !== 'pending') throw new AppError('EVENT_NOT_PENDING', 409)

  const decided = await decideEvent(actor, current.eventId, {
    status: 'rejected',
    reason: optionalReason(body.reason),
  })
  if (!decided) throw new AppError('EVENT_NOT_PENDING', 409)

  return findEvent(actor, current.eventId)
}

export async function cancelEvent(actor, eventId, body) {
  const current = await getEvent(actor, eventId)

  const closed = await closeEvent(actor, current.eventId, {
    status: 'cancelled',
    reason: optionalReason(body.reason),
    fromStatuses: EDITABLE_STATUSES,
  })
  if (!closed) throw new AppError('EVENT_NOT_EDITABLE', 409)

  return findEvent(actor, current.eventId)
}

export async function completeEvent(actor, eventId, body = {}) {
  const current = await getEvent(actor, eventId)
  if (current.status !== 'approved') throw new AppError('EVENT_NOT_COMPLETABLE', 409)
  if (current.eventDate > todayInParish()) throw new AppError('EVENT_NOT_COMPLETABLE', 409)

  const sacramental = current.eventType === 'sacramental'
  const registry = sacramental
    ? { bookNo: requireRegistryPart(body.bookNo), pageNo: requireRegistryPart(body.pageNo) }
    : null
  const details = sacramental ? requireDetails(body.participants) : new Map()

  for (let attempt = 1; attempt <= MAX_ISSUE_ATTEMPTS; attempt += 1) {
    try {
      const issued = await completeEventAndIssue(actor, {
        eventId: current.eventId,
        registry,
        details,
        planRecords,
        buildSnapshot,
        mintCode: mintVerificationCode,
      })
      if (!issued) throw new AppError('EVENT_NOT_COMPLETABLE', 409)

      return {
        event: await findEvent(actor, current.eventId),
        generated: { records: issued.records, certificates: issued.certificates },
        warnings: issued.warnings,
      }
    } catch (err) {
      const collision =
        err instanceof AppError &&
        (err.code === 'VERIFICATION_CODE_TAKEN' || err.code === 'REGISTRY_ENTRY_TAKEN')
      if (!collision || attempt === MAX_ISSUE_ATTEMPTS) throw err
    }
  }
}

export async function listEventCertificates(actor, eventId) {
  const event = await getEvent(actor, eventId)
  return findEventCertificates(actor, event.eventId)
}

export async function getEventCertificatePdf(actor, { eventId, certificateId }) {
  const certificate = await findEventCertificate(actor, {
    eventId: requireId(eventId, 'INVALID_EVENT_ID'),
    certificateId: requireId(certificateId, 'INVALID_CERTIFICATE_ID'),
  })
  if (!certificate) throw new AppError('CERTIFICATE_NOT_FOUND', 404)
  return renderCertificatePdf(certificate)
}