// The officiant's title and name, joined into the one text column that stores them.

export const OFFICIANT_TITLES = [
  'Rev. Fr.',
  'Fr.',
  'Msgr.',
  'Most Rev.',
  'His Eminence',
  'Rev. Dcn.',
]

export const OFFICIANT_MAX = 100

const BY_LENGTH = [...OFFICIANT_TITLES].sort((a, b) => b.length - a.length)

export function joinOfficiant(title, name) {
  const bare = String(name ?? '').trim()
  if (!title) return bare
  if (!bare) return title
  return `${title} ${bare}`
}

export function splitOfficiant(stored) {
  const value = String(stored ?? '').trim()

  for (const title of BY_LENGTH) {
    const prefix = `${title} `
    if (!value.startsWith(prefix)) continue
    const rest = value.slice(prefix.length)
    if (!rest || rest.startsWith(' ')) continue
    return { title, name: rest }
  }

  return { title: '', name: value }
}

export function officiantNameLimit(title) {
  return title ? OFFICIANT_MAX - title.length - 1 : OFFICIANT_MAX
}
