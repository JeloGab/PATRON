import { AppError } from './appError.js'


export const LIMITS = {
  fullName: { min: 2, max: 50 },
  parishName: { min: 3, max: 50 },
  address: { min: 5 },
  email: { max: 60 },
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_NOISE = /[\s()\-.]/g
const PH_MOBILE = /^(?:\+?63|0)9(\d{9})$/

export const clean = (value) => String(value ?? '').trim()

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