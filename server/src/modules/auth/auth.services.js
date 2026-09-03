import bcrypt from 'bcryptjs'
import { AppError } from '../../lib/appError.js'
import { signToken } from './auth.token.js'
import { findStaffByUsername, findOwnPasswordHash, setPassword, findSelf } from './auth.queries.js'
import {signUp,signInWithPassword,requestRecovery, updatePassword} from '../../integrations/supabaseAuth.js'
import {  findParishionerBySupabaseId, insertParishioner,} from './auth.queries.js'

const BCRYPT_ROUNDS = 12
const DUMMY_HASH = bcrypt.hashSync('no-such-user', BCRYPT_ROUNDS)
const normaliseEmail = (email) => String(email ?? '').trim().toLowerCase()

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

function providerMessage(payload) {
  return String(
    payload.error_description || payload.msg || payload.error || ''
  ).toLowerCase()
}

export async function registerParishioner({ fullName, email, password }) {
  const name = String(fullName ?? '').trim()

  if (name.length < 2) throw new AppError('INVALID_NAME', 400)
  if (!normaliseEmail(email).includes('@')) throw new AppError('INVALID_EMAIL', 400)
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('PASSWORD_TOO_SHORT', 400)
  }
  if (Buffer.byteLength(password) > 72) throw new AppError('PASSWORD_TOO_LONG', 400)

  const { ok, payload } = await signUp({
    email: normaliseEmail(email),
    password,
    fullName: name,
  })

  if (!ok) {
    const message = providerMessage(payload)
    if (message.includes('password')) throw new AppError('PASSWORD_TOO_SHORT', 400)
    if (message.includes('email')) throw new AppError('INVALID_EMAIL', 400)
    throw new AppError('AUTH_PROVIDER_ERROR', 502)
  }
  return { emailVerificationRequired: true }
}

export async function loginParishioner({ email, password }) {
  const { ok, payload } = await signInWithPassword({
    email: normaliseEmail(email),
    password,
  })

  if (!ok) {
    if (providerMessage(payload).includes('not confirmed')) {
      throw new AppError('EMAIL_NOT_VERIFIED', 403)
    }
    throw new AppError('INVALID_CREDENTIALS', 401)
  }

  const supabaseUserId = payload.user?.id
  const verifiedEmail = payload.user?.email
  const fullName = payload.user?.user_metadata?.full_name

  if (!supabaseUserId || !verifiedEmail) throw new AppError('AUTH_PROVIDER_ERROR', 502)
  let me = await findParishionerBySupabaseId(supabaseUserId)

  if (!me) {
    await insertParishioner({
      fullName: fullName || verifiedEmail,
      email: verifiedEmail,
      supabaseUserId,
    })
    me = await findParishionerBySupabaseId(supabaseUserId)
    if (!me) throw new AppError('PROVISIONING_FAILED', 500)
  }

  if (me.status !== 'active') throw new AppError('ACCOUNT_INACTIVE', 403)

  const user = {
    userId: me.userId,
    fullName: me.fullName,
    role: me.role,
    parishId: null,
    mustChangePassword: false,
  }

  return { token: signToken(user), user }
}

export async function requestPasswordReset({ email }) {
  const { ok, status, payload } = await requestRecovery({ email: normaliseEmail(email) })
  if (!ok) {
    console.error('[auth] recovery email not sent:', status, providerMessage(payload))
  }

  return { sent: true }
}

export async function completePasswordReset({ accessToken, newPassword }) {
  if (typeof accessToken !== 'string' || accessToken.length < 10) {
    throw new AppError('INVALID_RESET_TOKEN', 400)
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AppError('PASSWORD_TOO_SHORT', 400)
  }
  if (Buffer.byteLength(newPassword) > 72) throw new AppError('PASSWORD_TOO_LONG', 400)

  const { ok, status, payload } = await updatePassword({
    accessToken,
    password: newPassword,
  })

  if (!ok) {
    if (status === 401 || status === 403) throw new AppError('INVALID_RESET_TOKEN', 401)
    if (providerMessage(payload).includes('password')) {
      throw new AppError('PASSWORD_TOO_SHORT', 400)
    }
    throw new AppError('AUTH_PROVIDER_ERROR', 502)
  }
  return { passwordChanged: true }
}