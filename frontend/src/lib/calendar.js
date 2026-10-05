const CLOSED_REASONS = [
  'Parish office closed',
  'Reserved for a parish observance',
  'Fully booked',
]

function hashKey(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function dayAvailability(churchId, date) {
  const key = `${churchId}|${date.getFullYear()}|${date.getMonth()}|${date.getDate()}`
  const n = hashKey(key)
  if (n % 5 === 0) {
    return {
      status: 'unavailable',
      reason: CLOSED_REASONS[n % CLOSED_REASONS.length],
    }
  }
  return {
    status: 'available',
    reason: 'Open for parish appointments',
  }
}

export function monthDays(churchId, year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month, index + 1)
    return { date, ...dayAvailability(churchId, date) }
  })
}
