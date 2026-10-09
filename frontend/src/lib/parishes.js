// Parish helpers.
//
// `loadParishes` / `saveParishes` lived here and seeded `localStorage` from
// `data/initialParishes.js`. They are gone: parishes now come from
// `GET /api/admin/parishes`, and keeping a browser-side copy of them would give every
// sysadmin a private, divergent registry. `createParishId` is gone too — Postgres
// mints the uuid via `gen_random_uuid()`.
//
// What survives is the two functions that compute rather than store.

// The parish table has no `municipality` column, so the card derives one from the
// address. Last comma-separated part first, since a PH address ends
// "…, Libmanan, Camarines Sur".
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

// `ChurchMedia` colours its placeholder from an `accent`, which the mock parishes
// carried and real ones do not. Derived from the uuid so a parish keeps the same
// colour across reloads and machines, rather than flickering on every render.
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
