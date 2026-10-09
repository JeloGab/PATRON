import express, { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  editAnnouncement,
  approveAnnouncement,
  rejectAnnouncement,
  archiveAnnouncement,
  attachImage,
  listImages,
  getImageFile,
  removeImage,
  IMAGE_TYPES,
} from './announcements.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

const managerOnly = requireRole('manager')
const priestOnly = requireRole('priest')
const upload = express.raw({ type: IMAGE_TYPES, limit: '2mb' })

router.get('/', async (req, res) => {
  res.json({ ok: true, announcements: await listAnnouncements(req.user, req.query) })
})

router.get('/:announcementId', async (req, res) => {
  res.json({ ok: true, announcement: await getAnnouncement(req.user, req.params.announcementId) })
})

router.post('/', async (req, res) => {
  res.status(201).json({ ok: true, announcement: await createAnnouncement(req.user, req.body ?? {}) })
})

router.patch('/:announcementId', managerOnly, async (req, res) => {
  res.json({
    ok: true,
    announcement: await editAnnouncement(req.user, req.params.announcementId, req.body ?? {}),
  })
})

router.post('/:announcementId/approve', priestOnly, async (req, res) => {
  res.json({ ok: true, announcement: await approveAnnouncement(req.user, req.params.announcementId) })
})

router.post('/:announcementId/reject', priestOnly, async (req, res) => {
  res.json({
    ok: true,
    announcement: await rejectAnnouncement(req.user, req.params.announcementId, req.body ?? {}),
  })
})

router.post('/:announcementId/archive', async (req, res) => {
  res.json({ ok: true, announcement: await archiveAnnouncement(req.user, req.params.announcementId) })
})

router.post('/:announcementId/images', upload, async (req, res) => {
  const image = await attachImage(req.user, req.params.announcementId, {
    fileName: req.get('x-file-name'),
    buffer: req.body,
    typeAccepted: req.is(IMAGE_TYPES) !== false,
  })
  res.status(201).json({ ok: true, image })
})

router.get('/:announcementId/images', async (req, res) => {
  res.json({ ok: true, images: await listImages(req.user, req.params.announcementId) })
})

router.get('/:announcementId/images/:imageId', async (req, res) => {
  const { announcementId, imageId } = req.params
  const file = await getImageFile(req.user, { announcementId, imageId })
  res.type(file.contentType)
  res.set('Content-Disposition', `inline; filename="${file.fileName}"`)
  res.send(file.content)
})

router.delete('/:announcementId/images/:imageId', async (req, res) => {
  const { announcementId, imageId } = req.params
  await removeImage(req.user, { announcementId, imageId })
  res.json({ ok: true })
})

export default router