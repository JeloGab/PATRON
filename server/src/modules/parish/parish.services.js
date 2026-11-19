import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireParishName, requireAddress, requireMobile, optionalEmail, optionalOfficeHours, optionalMassSchedule, optionalPatronSaint, optionalFeastDay, optionalYearEstablished, optionalHistory } from '../../lib/validators.js'
import { sniffContentType, sanitizeFileName } from '../../lib/fileType.js'
import { findOwnParish, updateOwnParish, listParishDirectory, findDirectoryEntry, listActivePriests, setParishPhoto, clearParishPhoto, findPublicParishPhoto, listPublicClergy, findPublicClergyPhoto, setParishSeal, clearParishSeal, findPublicParishSeal, listGalleryImages, insertGalleryImage, deleteGalleryImage, listPublicGalleryIds, findPublicGalleryImage } from './parish.queries.js'

export const PHOTO_TYPES = ['image/jpeg', 'image/png']
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export const SEAL_TYPES = ['image/jpeg', 'image/png']
const MAX_SEAL_BYTES = 1 * 1024 * 1024

export const GALLERY_TYPES = ['image/jpeg', 'image/png']
const MAX_GALLERY_BYTES = 5 * 1024 * 1024
const MAX_GALLERY_IMAGES = 4



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
  if (body.officeHours !== undefined) patch.officeHours = optionalOfficeHours(body.officeHours)
  if (body.massSchedule !== undefined) patch.massSchedule = optionalMassSchedule(body.massSchedule)
  if (body.patronSaint !== undefined) patch.patronSaint = optionalPatronSaint(body.patronSaint)
  if (body.feastDay !== undefined) patch.feastDay = optionalFeastDay(body.feastDay)
  if (body.yearEstablished !== undefined) patch.yearEstablished = optionalYearEstablished(body.yearEstablished)
  if (body.history !== undefined) patch.history = optionalHistory(body.history)

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

  return {
    ...parish,
    priests: await listPublicClergy(target),
    galleryImageIds: await listPublicGalleryIds(target),
    hasSeal: Boolean(await findPublicParishSeal(target)),
  }
}

export async function getActivePriests(actor) {
  return listActivePriests(actor)
}

export async function setPhoto(actor, { buffer, typeAccepted = true }) {
  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_PHOTO_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!PHOTO_TYPES.includes(contentType)) throw new AppError('INVALID_FILE_TYPE', 400)

  const changed = await setParishPhoto(actor, { contentType, content: buffer })
  if (changed === 0) throw new AppError('PARISH_NOT_FOUND', 404)

  return getOwnParish(actor)
}

export async function removePhoto(actor) {
  const changed = await clearParishPhoto(actor)
  if (changed === 0) throw new AppError('PARISH_NOT_FOUND', 404)

  return getOwnParish(actor)
}

export async function getPublicPhoto(parishId) {
  const target = clean(parishId)
  if (!isUuid(target)) throw new AppError('INVALID_PARISH_ID', 400)

  const photo = await findPublicParishPhoto(target)
  if (!photo) throw new AppError('IMAGE_NOT_FOUND', 404)

  return photo
}


export async function getPublicClergyPhoto(parishId, userId) {
  const parish = clean(parishId)
  const user = clean(userId)
  if (!isUuid(parish)) throw new AppError('INVALID_PARISH_ID', 400)
  if (!isUuid(user)) throw new AppError('INVALID_USER_ID', 400)

  const photo = await findPublicClergyPhoto(parish, user)
  if (!photo) throw new AppError('IMAGE_NOT_FOUND', 404)

  return photo
}

export async function setSeal(actor, { buffer, typeAccepted = true }) {
  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_SEAL_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!SEAL_TYPES.includes(contentType)) throw new AppError('INVALID_FILE_TYPE', 400)

  const changed = await setParishSeal(actor, { contentType, content: buffer })
  if (changed === 0) throw new AppError('PARISH_NOT_FOUND', 404)

  return getOwnParish(actor)
}

export async function removeSeal(actor) {
  const changed = await clearParishSeal(actor)
  if (changed === 0) throw new AppError('PARISH_NOT_FOUND', 404)

  return getOwnParish(actor)
}

export async function getPublicSeal(parishId) {
  const target = clean(parishId)
  if (!isUuid(target)) throw new AppError('INVALID_PARISH_ID', 400)

  const seal = await findPublicParishSeal(target)
  if (!seal) throw new AppError('IMAGE_NOT_FOUND', 404)

  return seal
}

export async function getGallery(actor) {
  return listGalleryImages(actor)
}

export async function addGalleryImage(actor, { fileName, buffer, typeAccepted = true }) {
  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_GALLERY_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!GALLERY_TYPES.includes(contentType)) throw new AppError('INVALID_FILE_TYPE', 400)

  const result = await insertGalleryImage(actor, {
    fileName: sanitizeFileName(fileName, contentType),
    contentType,
    content: buffer,
    max: MAX_GALLERY_IMAGES,
  })
  if (result.full) throw new AppError('GALLERY_FULL', 409)

  return result.images
}

export async function removeGalleryImage(actor, imageId) {
  const target = clean(imageId)
  if (!isUuid(target)) throw new AppError('INVALID_IMAGE_ID', 400)

  const images = await deleteGalleryImage(actor, target)
  if (!images) throw new AppError('IMAGE_NOT_FOUND', 404)

  return images
}

export async function getPublicGalleryImage(parishId, imageId) {
  const parish = clean(parishId)
  const image = clean(imageId)
  if (!isUuid(parish)) throw new AppError('INVALID_PARISH_ID', 400)
  if (!isUuid(image)) throw new AppError('INVALID_IMAGE_ID', 400)

  const found = await findPublicGalleryImage(parish, image)
  if (!found) throw new AppError('IMAGE_NOT_FOUND', 404)

  return found
}
