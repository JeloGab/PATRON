import { AppError } from '../../lib/appError.js'
import {
  suggestUsername,
  isValidUsername,
  isUuid,
  createTempCredential,
  resolveUsername,
} from '../../lib/credentials.js'
import {
  insertManager,
  listManagers,
  setManagerStatus,
  setManagerPassword,
} from './users.queries.js'

const clean = (value) => String(value ?? '').trim()

export async function provisionManager(actor, { fullName, username }) {
  const name = clean(fullName)

  if (!actor.parishId) throw new AppError('FORBIDDEN', 403)
  if (name.length < 2) throw new AppError('INVALID_NAME', 400)

  const requested = clean(username).toLowerCase()
  if (requested && !isValidUsername(requested)) throw new AppError('INVALID_USERNAME', 400)

  const base = requested || suggestUsername(name)
  if (!isValidUsername(base)) throw new AppError('INVALID_USERNAME', 400)

  const { tempPassword, passwordHash } = await createTempCredential()

  const user = await resolveUsername({ base, explicit: Boolean(requested) }, (candidate) =>
    insertManager(actor, { fullName: name, username: candidate, passwordHash })
  )

  return { user, tempPassword }
}

export async function getManagers(actor) {
  return listManagers(actor)
}

export async function setManagerActive(actor, { userId, status }) {
  if (!isUuid(userId)) throw new AppError('INVALID_USER_ID', 400)
  if (status !== 'active' && status !== 'inactive') throw new AppError('INVALID_STATUS', 400)

  const user = await setManagerStatus(actor, { userId: clean(userId), status })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)

  return user
}

export async function resetManagerPassword(actor, userId) {
  if (!isUuid(userId)) throw new AppError('INVALID_USER_ID', 400)

  const { tempPassword, passwordHash } = await createTempCredential()

  const user = await setManagerPassword(actor, { userId: clean(userId), passwordHash })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)

  return { user, tempPassword }
}