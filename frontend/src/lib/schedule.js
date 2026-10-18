// Event and blocked-date vocabulary, plus the 92-day-safe month window.

import { toISODate, buildMonthGrid } from './dates.js'

export const EVENT_TYPES = [
  { value: 'sacramental', label: 'Sacramental' },
  { value: 'general', label: 'General' },
  { value: 'seminar', label: 'Seminar' },
]

export const SACRAMENT_TYPES = [
  { value: 'baptism', label: 'Baptism' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'funeral', label: 'Funeral' },
]

export const STATUS_LABEL = {
  pending: 'For approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export const EDITABLE_STATUSES = ['pending', 'approved']

const PILL_BY_STATUS = {
  pending: 'status-pill--pending',
  approved: 'status-pill--approved',
  rejected: 'status-pill--rejected',
  cancelled: 'status-pill--cancelled',
  completed: 'status-pill--done',
}

export function statusPill(status) {
  return `status-pill ${PILL_BY_STATUS[status] ?? ''}`
}

export const TYPE_LABEL = {
  sacramental: 'Sacramental',
  general: 'General',
  seminar: 'Seminar',
}

export const SACRAMENT_LABEL = {
  baptism: 'Baptism',
  confirmation: 'Confirmation',
  marriage: 'Marriage',
  funeral: 'Funeral',
}

export function eventCategory(event) {
  return event.eventType
}

export function eventTypeLabel(event) {
  if (event.eventType === 'sacramental') {
    return SACRAMENT_LABEL[event.sacramentType] ?? 'Sacramental'
  }
  return TYPE_LABEL[event.eventType] ?? event.eventType
}

export function timeRange(startTime, endTime) {
  return `${clock(startTime)} – ${clock(endTime)}`
}

export function clock(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const value = new Date(2000, 0, 1, hours, minutes)
  return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function monthWindow(year, month) {
  const cells = buildMonthGrid(year, month)
  return { from: toISODate(cells[0]), to: toISODate(cells[cells.length - 1]) }
}

export function groupByDate(items, key) {
  const map = new Map()
  for (const item of items) {
    const iso = item[key]
    const list = map.get(iso) ?? []
    list.push(item)
    map.set(iso, list)
  }
  return map
}

export const CHECK_MESSAGES = {
  DATE_BLOCKED:
    'That date is blocked for the whole parish. Choose another date, or remove the block first.',
  PRIEST_UNAVAILABLE:
    'The assigned priest is unavailable then. Choose another time, another priest, or clear his unavailability.',
  PRIEST_SCHEDULE_CONFLICT:
    'That priest already has an event overlapping this time. Touching times count as a conflict.',
}
