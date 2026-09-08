import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { AppError } from './appError.js'

const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,19}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BCRYPT_ROUNDS = 12
const MAX_USERNAME_ATTEMPTS = 20

export function generateTempPassword() {
  const groups = []
  for (let g = 0; g < 3; g++) {
    let block = ''
    for (let i = 0; i < 4; i++) {
       block += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]
    }
    groups.push(block)
  }
  return groups.join('-')
}

export function suggestUsername(fullName) {
  const parts = String(fullName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (parts.length === 0) return ''

  const base = parts.length === 1 ? parts[0] : parts[0][0] + parts[parts.length - 1]
  return base.slice(0, 20)
}

export function withSuffix(base, n) {
  const suffix = String(n)
  return base.slice(0, 20 - suffix.length) + suffix
}

export function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_PATTERN.test(username)
}

export function isUuid(value) {
  return UUID_PATTERN.test(String(value ?? '').trim())
}

export async function createTempCredential() {
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS)
  return { tempPassword, passwordHash }
}

export async function resolveUsername({ base, explicit }, attempt) {
  const attempts = explicit ? 1 : MAX_USERNAME_ATTEMPTS

  for (let n = 0; n < attempts; n++) {
    const candidate = n === 0 ? base : withSuffix(base, n + 1)
    try {
      return await attempt(candidate)
    } catch (err) {
      if (err instanceof AppError && err.code === 'USERNAME_TAKEN') continue
      throw err
    }
  }

  throw new AppError('USERNAME_TAKEN', 409)
}