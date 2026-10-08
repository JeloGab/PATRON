export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function isoOffset(days, from = new Date()) {
  const date = new Date(from)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function weekdayOffset(targetDay, from = new Date()) {
  return targetDay - from.getDay()
}

export function startOfWeek(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export function isUpcomingEvent(event, today = todayISO()) {
  return event.date >= today
}

export function isThisWeek(event, now = new Date()) {
  const start = startOfWeek(now)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return event.date >= toISODate(start) && event.date <= toISODate(end)
}

export function formatWeekRange(now = new Date()) {
  const start = startOfWeek(now)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', sameMonth
    ? { day: 'numeric' }
    : { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function formatLongDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date, time) {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const value = new Date(year, month - 1, day, hours, minutes)
  const dayLabel = value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const clock = value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dayLabel} · ${clock}`
}

export function formatMonth(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatWeekdayDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}
