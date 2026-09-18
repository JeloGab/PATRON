import { AppError } from './appError.js'


export const LIMITS = {
  fullName: { min: 2, max: 50 },
  parishName: { min: 3, max: 50 },
  address: { min: 5 },
  email: { max: 60 },
  subjectName: { min: 2, max: 100 },
  officiant: { min: 2, max: 100 },
  registryPart: { min: 1, max: 20 },
  placeOfBirth: { max: 100 },
  sponsorNames: { max: 200 },
  reason: { max: 200 },
  title: { min: 3, max: 100 },
  description: { max: 500 },
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const RECORD_TYPES = ['baptism', 'confirmation', 'marriage', 'death']
const GENDERS = ['male', 'female']
const PARISH_TIMEZONE = 'Asia/Manila'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_NOISE = /[\s()\-.]/g
const PH_MOBILE = /^(?:\+?63|0)9(\d{9})$/
const BLOCK_TYPES = ['parish', 'priest']
const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const EVENT_TYPES = ['sacramental', 'general', 'seminar']
const SACRAMENT_TYPES = ['baptism', 'confirmation', 'marriage', 'funeral']

export const clean = (value) => String(value ?? '').trim()
export const squeeze = (value) => clean(value).replace(/\s+/g, ' ')

export function requireFullName(value) {
  const name = clean(value)
  if (name.length < LIMITS.fullName.min) throw new AppError('INVALID_NAME', 400)
  if (name.length > LIMITS.fullName.max) throw new AppError('INVALID_NAME', 400)
  return name
}

export function requireParishName(value) {
  const name = clean(value)
  if (name.length < LIMITS.parishName.min) throw new AppError('INVALID_PARISH_NAME', 400)
  if (name.length > LIMITS.parishName.max) throw new AppError('INVALID_PARISH_NAME', 400)
  return name
}

export function requireAddress(value) {
  const address = clean(value)
  if (address.length < LIMITS.address.min) throw new AppError('INVALID_ADDRESS', 400)
  return address
}


export function requireMobile(value) {
  const stripped = clean(value).replace(PHONE_NOISE, '')
  const match = PH_MOBILE.exec(stripped)
  if (!match) throw new AppError('INVALID_CONTACT', 400)
  return `09${match[1]}`
}


export function optionalEmail(value) {
  const email = clean(value).toLowerCase()
  if (!email) return null
  if (email.length > LIMITS.email.max) throw new AppError('INVALID_EMAIL', 400)
  if (!EMAIL_PATTERN.test(email)) throw new AppError('INVALID_EMAIL', 400)
  return email
}

export function requireEmail(value) {
  const email = optionalEmail(value)
  if (!email) throw new AppError('INVALID_EMAIL', 400)
  return email
}

export function requireRecordType(value) {
  const type = clean(value).toLowerCase()
  if (!RECORD_TYPES.includes(type)) throw new AppError('INVALID_RECORD_TYPE', 400)
  return type
}

export function requireGender(value) {
  const gender = clean(value).toLowerCase()
  if (!GENDERS.includes(gender)) throw new AppError('INVALID_GENDER', 400)
  return gender
}

export function requireRegistryPart(value) {
  const part = squeeze(value)
  if (part.length < LIMITS.registryPart.min) throw new AppError('INVALID_REGISTRY_NUMBER', 400)
  if (part.length > LIMITS.registryPart.max) throw new AppError('INVALID_REGISTRY_NUMBER', 400)
  return part
}

export function requireSubjectName(value) {
  const name = squeeze(value)
  if (name.length < LIMITS.subjectName.min) throw new AppError('INVALID_NAME', 400)
  if (name.length > LIMITS.subjectName.max) throw new AppError('INVALID_NAME', 400)
  return name
}

export function optionalSubjectName(value) {
  if (!squeeze(value)) return null
  return requireSubjectName(value)
}

export function requireOfficiant(value) {
  const name = squeeze(value)
  if (name.length < LIMITS.officiant.min) throw new AppError('INVALID_OFFICIANT', 400)
  if (name.length > LIMITS.officiant.max) throw new AppError('INVALID_OFFICIANT', 400)
  return name
}

export function optionalPlaceOfBirth(value) {
  const place = squeeze(value)
  if (!place) return null
  if (place.length > LIMITS.placeOfBirth.max) throw new AppError('INVALID_ADDRESS', 400)
  return place
}

export function optionalSponsorNames(value) {
  const names = squeeze(value)
  if (!names) return null
  if (names.length > LIMITS.sponsorNames.max) throw new AppError('INVALID_NAME', 400)
  return names
}

export function todayInParish() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PARISH_TIMEZONE }).format(new Date())
}

export function requireIsoDate(value, code) {
  const text = clean(value)
  const match = ISO_DATE.exec(text)
  if (!match) throw new AppError(code, 400)

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  if (!real) throw new AppError(code, 400)

  return text
}

export function requirePastDate(value, code) {
  const text = requireIsoDate(value, code)
  if (text > todayInParish()) throw new AppError(code, 400)
  return text
}

export function requireUpcomingDate(value, code) {
  const text = requireIsoDate(value, code)
  if (text < todayInParish()) throw new AppError(code, 400)
  return text
}

export function optionalPastDate(value, code) {
  if (!clean(value)) return null
  return requirePastDate(value, code)
}

export function requireBlockType(value) {
  const type = clean(value).toLowerCase()
  if (!BLOCK_TYPES.includes(type)) throw new AppError('INVALID_BLOCK_TYPE', 400)
  return type
}

export function optionalTime(value, code) {
  const text = clean(value)
  if (!text) return null
  if (!ISO_TIME.test(text)) throw new AppError(code, 400)
  return `${text}:00`
}

export function optionalReason(value) {
  const reason = squeeze(value)
  if (!reason) return null
  if (reason.length > LIMITS.reason.max) throw new AppError('INVALID_REASON', 400)
  return reason
}

export function requireEventType(value) {
  const type = clean(value).toLowerCase()
  if (!EVENT_TYPES.includes(type)) throw new AppError('INVALID_EVENT_TYPE', 400)
  return type
}

export function requireSacramentType(value) {
  const type = clean(value).toLowerCase()
  if (!SACRAMENT_TYPES.includes(type)) throw new AppError('INVALID_SACRAMENT_TYPE', 400)
  return type
}

export function requireTitle(value) {
  const title = squeeze(value)
  if (title.length < LIMITS.title.min) throw new AppError('INVALID_TITLE', 400)
  if (title.length > LIMITS.title.max) throw new AppError('INVALID_TITLE', 400)
  return title
}

export function optionalDescription(value) {
  const text = squeeze(value)
  if (!text) return null
  if (text.length > LIMITS.description.max) throw new AppError('INVALID_DESCRIPTION', 400)
  return text
}

export function requireTime(value, code) {
  const time = optionalTime(value, code)
  if (!time) throw new AppError(code, 400)
  return time
}