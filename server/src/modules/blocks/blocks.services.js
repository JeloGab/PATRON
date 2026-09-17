import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireBlockType, requireIsoDate, requireUpcomingDate, optionalTime, optionalReason } from '../../lib/validators.js'
import { findActivePriest, insertBlocks, findBlocks, deleteBlock } from './blocks.queries.js'

const MAX_RANGE_DAYS = 31
const MAX_WINDOW_DAYS = 92

function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}

function addDays(ymd, days) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function spanInDays(from, to) {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  const millis = Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)
  return millis / 86400000 + 1
}

function requireWindow(from, to, maxDays) {
  if (to < from) throw new AppError('INVALID_DATE_RANGE', 400)
  if (spanInDays(from, to) > maxDays) throw new AppError('INVALID_DATE_RANGE', 400)
}

export async function createBlocks(actor, body) {
  const type = requireBlockType(body.type)

  let priestId = null
  if (type === 'priest') {
    priestId = await findActivePriest(actor, requireId(body.priestId, 'INVALID_PRIEST'))
    if (!priestId) throw new AppError('INVALID_PRIEST', 400)
  }

  const fromDate = requireUpcomingDate(body.fromDate, 'INVALID_BLOCK_DATE')
  const toDate = clean(body.toDate)
    ? requireUpcomingDate(body.toDate, 'INVALID_BLOCK_DATE')
    : fromDate
  requireWindow(fromDate, toDate, MAX_RANGE_DAYS)

  const startTime = optionalTime(body.startTime, 'INVALID_TIME_RANGE')
  const endTime = optionalTime(body.endTime, 'INVALID_TIME_RANGE')
  if ((startTime === null) !== (endTime === null)) throw new AppError('INVALID_TIME_RANGE', 400)
  if (startTime && startTime >= endTime) throw new AppError('INVALID_TIME_RANGE', 400)

  const dates = []
  for (let offset = 0; offset < spanInDays(fromDate, toDate); offset += 1) {
    dates.push(addDays(fromDate, offset))
  }

  const blocks = await insertBlocks(actor, {
    type,
    priestId,
    dates,
    startTime,
    endTime,
    reason: optionalReason(body.reason),
  })

  // Warn-don't-touch: the events these blocks land on. Always empty until
  // parish_event exists — the field ships now so the client contract is final.
  return { blocks, warnings: [] }
}

export async function listBlocks(actor, query) {
  const from = requireIsoDate(query.from, 'INVALID_DATE_RANGE')
  const to = requireIsoDate(query.to, 'INVALID_DATE_RANGE')
  requireWindow(from, to, MAX_WINDOW_DAYS)

  return findBlocks(actor, { from, to })
}

export async function removeBlock(actor, blockedDateId) {
  const removed = await deleteBlock(actor, requireId(blockedDateId, 'INVALID_BLOCK_ID'))
  if (!removed) throw new AppError('BLOCK_NOT_FOUND', 404)
}