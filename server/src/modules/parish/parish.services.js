import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import {
  findOwnParish,
  updateOwnParish,
  listParishDirectory,
  findDirectoryEntry,
} from './parish.queries.js'

const clean = (value) => String(value ?? '').trim()

export async function getOwnParish(actor) {
  const parish = await findOwnParish(actor)
  if (!parish) throw new AppError('PARISH_NOT_FOUND', 404)

  return parish
}

export async function editOwnParish(actor, body) {
  const patch = {}

  if (body.name !== undefined) {
    const name = clean(body.name)
    if (name.length < 3) throw new AppError('INVALID_PARISH_NAME', 400)
    patch.name = name
  }

  if (body.address !== undefined) {
    const address = clean(body.address)
    if (address.length < 5) throw new AppError('INVALID_ADDRESS', 400)
    patch.address = address
  }

  if (body.contactNo !== undefined) {
    const contactNo = clean(body.contactNo)
    if (contactNo.length < 7) throw new AppError('INVALID_CONTACT', 400)
    patch.contactNo = contactNo
  }

  if (body.email !== undefined) {
    const email = clean(body.email).toLowerCase()
    if (email && !email.includes('@')) throw new AppError('INVALID_EMAIL', 400)
    patch.email = email || null
  }

  if (body.facebookPageId !== undefined) {
    patch.facebookPageId = clean(body.facebookPageId) || null
  }

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