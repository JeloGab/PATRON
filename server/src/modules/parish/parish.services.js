import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireParishName, requireAddress, requireMobile, optionalEmail } from '../../lib/validators.js'
import { findOwnParish, updateOwnParish, listParishDirectory, findDirectoryEntry } from './parish.queries.js'



export async function getOwnParish(actor) {
  const parish = await findOwnParish(actor)
  if (!parish) throw new AppError('PARISH_NOT_FOUND', 404)

  return parish
}

export async function editOwnParish(actor, body) {
  const patch = {}

  if (body.name !== undefined) patch.name = requireParishName(body.name)
  if (body.address !== undefined) patch.address = requireAddress(body.address)
  if (body.contactNo !== undefined) patch.contactNo = requireMobile(body.contactNo)
  if (body.email !== undefined) patch.email = optionalEmail(body.email)
  if (body.facebookPageId !== undefined) patch.facebookPageId = clean(body.facebookPageId) || null

  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const parish = await updateOwnParish(actor, patch)
  if (!parish) throw new AppError('PARISH_NOT_FOUND', 404)

  return parish
}

export async function getParishDirectory() {
  return listParishDirectory()
}

export async function getPublicParish(parishId) {
  const target = clean(parishId)
  if (!isUuid(target)) throw new AppError('INVALID_PARISH_ID', 400)

  const parish = await findDirectoryEntry(target)
  if (!parish) throw new AppError('PARISH_NOT_FOUND', 404)

  return parish
}