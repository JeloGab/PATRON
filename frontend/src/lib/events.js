import { seedEvents } from '../data/mock.js'

const STORAGE_KEY = 'patron.manager.events.v2'
const LEGACY_KEY = 'patron.manager.events.v1'

export function byDateTime(a, b) {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
}

export function eventCategory(event) {
  if (event.category === 'general' || event.category === 'seminar') return event.category
  return 'sacramental'
}

export function eventTypeLabel(event) {
  const category = eventCategory(event)
  if (category === 'sacramental') return event.sacrament || 'Sacramental'
  if (category === 'seminar') return 'Seminar'
  return 'General'
}

export function eventStatusLabel(event) {
  const requirements = event.requirements
  if (requirements && requirements.met < requirements.total) {
    return `Requirements ${requirements.met} out of ${requirements.total}`
  }
  return event.status === 'Confirmed' ? 'Confirmed' : 'Scheduled'
}

function readStored(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    return null
  }
  return null
}

function normalizeEvent(event) {
  return { ...event, category: eventCategory(event) }
}

export function loadEvents() {
  const stored = readStored(STORAGE_KEY) || readStored(LEGACY_KEY)
  if (!stored) return seedEvents().sort(byDateTime)

  const seedsById = new Map(seedEvents().map((event) => [event.id, event]))
  const normalized = stored.map((event) => {
    const next = normalizeEvent(event)
    const seed = seedsById.get(event.id)
    if (!seed) return next
    return {
      ...next,
      status: seed.status,
      requirements: seed.requirements || null,
    }
  })
  const categories = new Set(normalized.map((event) => event.category))
  const samples = seedEvents().filter(
    (event) => event.category !== 'sacramental' && !categories.has(event.category),
  )
  return [...normalized, ...samples].sort(byDateTime)
}

export function saveEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // The schedule still updates in memory for this visit.
  }
}

export function createEventRecord(input) {
  const category = eventCategory(input)
  const sacramental = category === 'sacramental'
  return {
    id: `evt-${Date.now().toString(36)}`,
    category,
    title: input.title.trim(),
    sacrament: sacramental ? input.sacrament : '',
    priest: sacramental ? input.priest : '',
    date: input.date,
    time: input.time,
    participants: sacramental ? Number(input.participants) : null,
    status: 'Scheduled',
  }
}
