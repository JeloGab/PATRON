import { AppError } from '../../lib/appError.js'
import { suggestUsername, isValidUsername, isUuid, createTempCredential, resolveUsername} from '../../lib/credentials.js'
import { sniffContentType } from '../../lib/fileType.js'
import { insertManager, listManagers, setManagerStatus, setManagerPassword, setOwnSignature, clearOwnSignature, findOwnSignature } from './users.queries.js'

export const SIGNATURE_TYPES = ['image/png']
const MAX_SIGNATURE_BYTES = 1024 * 1024
import { clean, requireFullName } from '../../lib/validators.js'


export async function saveSignature(actor, { buffer, typeAccepted = true }) {
  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_SIGNATURE_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!SIGNATURE_TYPES.includes(contentType)) throw new AppError('INVALID_FILE_TYPE', 400)

  const changed = await setOwnSignature(actor, { contentType, content: buffer })
  if (changed === 0) throw new AppError('USER_NOT_FOUND', 404)

  return { saved: true }
}

export async function deleteSignature(actor) {
  const changed = await clearOwnSignature(actor)
  if (changed === 0) throw new AppError('USER_NOT_FOUND', 404)

  return { removed: true }
}

export async function getSignature(actor) {
  const signature = await findOwnSignature(actor)
  if (!signature) throw new AppError('IMAGE_NOT_FOUND', 404)

  return signature
}

export async function provisionManager(actor, { fullName, username }) {
  if (!actor.parishId) throw new AppError('FORBIDDEN', 403)
  const name = requireFullName(fullName)

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