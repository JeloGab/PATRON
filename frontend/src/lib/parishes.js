import { initialParishes } from '../data/initialParishes.js'

const KEY = 'patron.system-admin.parishes'

export function loadParishes() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* use seed */
  }
  localStorage.setItem(KEY, JSON.stringify(initialParishes))
  return [...initialParishes]
}

export function saveParishes(parishes) {
  localStorage.setItem(KEY, JSON.stringify(parishes))
}

export function municipalityFromAddress(address) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return '—'
  const last = parts[parts.length - 1]
  const match = last.match(/\b([A-Za-z .'-]+(?: City|Municipality)?)\b/i)
  if (match) return match[1].trim()
  return parts[parts.length - 2] || parts[parts.length - 1] || '—'
}

export function formatRegisteredDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function createParishId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${Date.now().toString(36)}`
}
