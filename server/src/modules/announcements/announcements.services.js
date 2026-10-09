import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireTitle, requireContent, optionalReason } from '../../lib/validators.js'
import {
  insertAnnouncement,
  findAnnouncements,
  findAnnouncement,
  updateAnnouncement,
  decideAnnouncement,
  markArchived,
  insertImage,
  findImages,
  findImage,
  deleteImage,
  listFeed,
  findFeedImage,
} from './announcements.queries.js'
import { sniffContentType, sanitizeFileName } from '../../lib/fileType.js'

const STATUSES = ['pending', 'approved', 'rejected', 'archived']
export const IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const PAGE_SIZE = 20

function requireId(value) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError('INVALID_ANNOUNCEMENT_ID', 400)
  return id
}
function requireImageId(value) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError('INVALID_IMAGE_ID', 400)
  return id
}

function pageOf(value) {
  const page = Math.floor(Number(clean(value)))
  return Number.isFinite(page) && page > 0 ? page : 1
}

export async function createAnnouncement(actor, body) {
  const title = requireTitle(body.title)
  const content = requireContent(body.content)
  const bornApproved = actor.role === 'priest'

  return insertAnnouncement(actor, {
    title,
    content,
    status: bornApproved ? 'approved' : 'pending',
    approvedBy: bornApproved ? actor.userId : null,
  })
}

export async function listAnnouncements(actor, query) {
  const status = clean(query.status).toLowerCase()
  if (status && !STATUSES.includes(status)) throw new AppError('INVALID_STATUS', 400)
  return findAnnouncements(actor, { status: status || null })
}

export async function getAnnouncement(actor, announcementId) {
  const announcement = await findAnnouncement(actor, requireId(announcementId))
  if (!announcement) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return announcement
}

export async function editAnnouncement(actor, announcementId, body) {
  const id = requireId(announcementId)
  const current = await findAnnouncement(actor, id)
  if (!current) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  if (current.status === 'approved' || current.status === 'archived') {
    throw new AppError('ANNOUNCEMENT_LOCKED', 409)
  }

  const patch = {}
  if (Object.hasOwn(body, 'title')) patch.title = requireTitle(body.title)
  if (Object.hasOwn(body, 'content')) patch.content = requireContent(body.content)
  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const updated = await updateAnnouncement(actor, id, patch)
  if (!updated) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return getAnnouncement(actor, id)
}

export async function approveAnnouncement(actor, announcementId) {
  const id = requireId(announcementId)
  const decided = await decideAnnouncement(actor, id, { status: 'approved', reason: null })
  if (!decided) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return getAnnouncement(actor, id)
}

export async function rejectAnnouncement(actor, announcementId, body) {
  const id = requireId(announcementId)
  const decided = await decideAnnouncement(actor, id, {
    status: 'rejected',
    reason: optionalReason(body.reason),
  })
  if (!decided) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return getAnnouncement(actor, id)
}

export async function archiveAnnouncement(actor, announcementId) {
  const id = requireId(announcementId)
  const fromStatuses = actor.role === 'priest' ? ['approved'] : ['pending', 'rejected']

  const archived = await markArchived(actor, id, { fromStatuses })
  if (!archived) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return getAnnouncement(actor, id)
}

export async function attachImage(actor, announcementId, { fileName, buffer, typeAccepted = true }) {
  const id = requireId(announcementId)

  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_IMAGE_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!IMAGE_TYPES.includes(contentType)) throw new AppError('INVALID_FILE_TYPE', 400)

  const announcement = await findAnnouncement(actor, id)
  if (!announcement) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  if (announcement.status !== 'pending' && announcement.status !== 'rejected') {
    throw new AppError('ANNOUNCEMENT_LOCKED', 409)
  }

  return insertImage(actor, {
    announcementId: id,
    fileName: sanitizeFileName(fileName, contentType),
    contentType,
    content: buffer,
  })
}

export async function listImages(actor, announcementId) {
  const id = requireId(announcementId)
  const announcement = await findAnnouncement(actor, id)
  if (!announcement) throw new AppError('ANNOUNCEMENT_NOT_FOUND', 404)
  return findImages(actor, id)
}

export async function getImageFile(actor, { announcementId, imageId }) {
  const file = await findImage(actor, {
    announcementId: requireId(announcementId),
    imageId: requireImageId(imageId),
  })
  if (!file) throw new AppError('IMAGE_NOT_FOUND', 404)
  return file
}

export async function removeImage(actor, { announcementId, imageId }) {
  const removed = await deleteImage(actor, {
    announcementId: requireId(announcementId),
    imageId: requireImageId(imageId),
  })
  if (!removed) throw new AppError('IMAGE_NOT_FOUND', 404)
}

// ── public ────────────────────────────────────────────────────────────────

export async function getPublicFeed(query) {
  const page = pageOf(query?.page)
  const { announcements, hasMore } = await listFeed({
    parishId: null,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })
  return { announcements, page, hasMore }
}

export async function getParishFeed(parishId, query) {
  const id = clean(parishId).toLowerCase()
  if (!isUuid(id)) throw new AppError('INVALID_PARISH_ID', 400)

  const page = pageOf(query?.page)
  const { announcements, hasMore } = await listFeed({
    parishId: id,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })
  return { announcements, page, hasMore }
}

export async function getPublicImage({ announcementId, slotNo }) {
  const id = requireId(announcementId)
  const slot = Number(slotNo)
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) throw new AppError('IMAGE_NOT_FOUND', 404)

  const file = await findFeedImage({ announcementId: id, slotNo: slot })
  if (!file) throw new AppError('IMAGE_NOT_FOUND', 404)
  return file
}