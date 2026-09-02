import bcrypt from 'bcryptjs'
import { AppError } from '../../lib/appError.js'
import { signToken } from './auth.token.js'
import { findStaffByUsername, findOwnPasswordHash, setPassword, findSelf } from './auth.queries.js'

const BCRYPT_ROUNDS = 12
const DUMMY_HASH = bcrypt.hashSync('no-such-user', BCRYPT_ROUNDS)

export async function loginStaff(username, password) {
  const staff = await findStaffByUsername(username)
  const ok = await bcrypt.compare(password, staff?.passwordHash ?? DUMMY_HASH)

  if (!staff || !ok) throw new AppError('INVALID_CREDENTIALS', 401)
  if (staff.status !== 'active') throw new AppError('ACCOUNT_INACTIVE', 403)

  const user = {
    userId: staff.userId,
    fullName: staff.fullName,
    role: staff.role,
    parishId: staff.parishId,
    mustChangePassword: staff.mustChangePassword,
  }

  return { token: signToken(user), user }
}

export async function changePassword(actor, currentPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AppError('PASSWORD_TOO_SHORT', 400)
  }
  if (Buffer.byteLength(newPassword) > 72) {
    throw new AppError('PASSWORD_TOO_LONG', 400)
  }

  const hash = await findOwnPasswordHash(actor)
  if (!hash) throw new AppError('NOT_A_STAFF_ACCOUNT', 403)

  const ok = await bcrypt.compare(currentPassword ?? '', hash)
  if (!ok) throw new AppError('INVALID_CREDENTIALS', 401)

  const next = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  const rowCount = await setPassword(actor, next)
  if (rowCount === 0) throw new AppError('UPDATE_BLOCKED', 403)
}

export async function getSelf(actor) {
  const me = await findSelf(actor)
  if (!me) throw new AppError('NOT_FOUND', 404)
  return me
}