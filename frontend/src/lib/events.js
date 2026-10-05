export function byDateTime(a, b) {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
}

export function eventTypeLabel(event) {
  if (event.category === 'seminar') return 'Seminar'
  if (event.category === 'general') return 'General'
  return event.sacrament || 'Sacramental'
}

export function eventStatusLabel(event) {
  const requirements = event.requirements
  if (requirements && requirements.met < requirements.total) {
    return `Requirements ${requirements.met} out of ${requirements.total}`
  }
  return event.status === 'Confirmed' ? 'Confirmed' : 'Scheduled'
}
