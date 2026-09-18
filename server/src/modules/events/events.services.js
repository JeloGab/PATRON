import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireEventType, requireSacramentType, requireTitle, optionalDescription, requireIsoDate, requireUpcomingDate, requireTime, optionalReason, todayInParish } from '../../lib/validators.js'
import { findActivePriest } from '../parish/parish.queries.js'
import { findEvent, findEvents, insertEvent, updateEvent, decideEvent, closeEvent, findBlockConflict, findScheduleConflict } from './events.queries.js'

const MAX_WINDOW_DAYS = 92
const EDITABLE_STATUSES = ['pending', 'approved']
const RESCHEDULE_FIELDS = ['eventDate', 'startTime', 'endTime', 'assignedPriestId']

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

// Rule 1, in order, stopping at the first failure.
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

  // A priest approved one specific slot. Move it, and it needs approving again.
  const resetApproval = rescheduled && next.eventType === 'sacramental' && current.status === 'approved'

  const changed = await updateEvent(actor, current.eventId, { patch, resetApproval })
  if (!changed) throw new AppError('EVENT_NOT_FOUND', 404)

  return findEvent(actor, current.eventId)
}

export async function approveEvent(actor, eventId) {
  const current = await getEvent(actor, eventId)
  if (current.status !== 'pending') throw new AppError('EVENT_NOT_PENDING', 409)

  // Decision 14: the checks run again, because the calendar may have moved on.
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

export async function completeEvent(actor, eventId) {
  const current = await getEvent(actor, eventId)
  if (current.status !== 'approved') throw new AppError('EVENT_NOT_COMPLETABLE', 409)
  if (current.eventDate > todayInParish()) throw new AppError('EVENT_NOT_COMPLETABLE', 409)

  const closed = await closeEvent(actor, current.eventId, {
    status: 'completed',
    reason: null,
    fromStatuses: ['approved'],
  })
  if (!closed) throw new AppError('EVENT_NOT_COMPLETABLE', 409)

  return findEvent(actor, current.eventId)
}