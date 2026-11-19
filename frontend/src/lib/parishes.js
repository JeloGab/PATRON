// Parish helpers that compute rather than store.

export const LIMITS = {
  officeHours: { max: 300 },
  massSchedule: { max: 600 },
  patronSaint: { max: 60 },
  feastDay: { max: 40 },
  history: { max: 1200 },
}

export const YEAR_ESTABLISHED_MIN = 1521

export function municipalityFromAddress(address) {
  const parts = String(address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return '—'
  const last = parts[parts.length - 1]
  const match = last.match(/\b([A-Za-z .'-]+(?: City|Municipality)?)\b/i)
  if (match) return match[1].trim()
  return parts[parts.length - 2] || parts[parts.length - 1] || '—'
}

export function formatRegisteredDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const ACCENTS = ['#5c1824', '#4a1c14', '#3d5a3a', '#2c3d5a', '#1e4d6b', '#3b2a55']

export function accentFor(id) {
  const key = String(id ?? '')
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ACCENTS[(hash >>> 0) % ACCENTS.length]
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// feast_day is free text by design — "December 8", "Second Sunday of October", "Easter
// Monday" are all legitimate. The calendar leaf needs a day and a month, so this returns
// them only when both are unambiguous and the caller falls back to the raw text.
export function feastParts(value) {
  const text = String(value ?? '').trim()
  if (!text) return null

  const lower = text.toLowerCase()
  const month = MONTHS.find((name) => lower.includes(name.slice(0, 3).toLowerCase()))
  const digits = text.match(/\b(\d{1,2})\b/)
  if (!month || !digits) return null

  const day = Number(digits[1])
  if (day < 1 || day > 31) return null

  return { day: String(day), month }
}
