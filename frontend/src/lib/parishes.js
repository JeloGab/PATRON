// Parish helpers that compute rather than store.

export const LIMITS = {
  officeHours: { max: 300 },
  massSchedule: { max: 600 },
}

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
