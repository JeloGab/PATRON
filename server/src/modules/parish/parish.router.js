import express, { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { getOwnParish, editOwnParish, getActivePriests, setPhoto, removePhoto, setSeal, removeSeal, getGallery, addGalleryImage, removeGalleryImage, setPageToken, removePageToken, getFacebookConnectUrl, connectFacebookPage, PHOTO_TYPES, SEAL_TYPES, GALLERY_TYPES } from './parish.services.js'

const router = Router()

const upload = express.raw({ type: PHOTO_TYPES, limit: '2mb' })
const sealUpload = express.raw({ type: SEAL_TYPES, limit: '1mb' })
const galleryUpload = express.raw({ type: GALLERY_TYPES, limit: '5mb' })

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

router.get('/', async (req, res) => {
  res.json({ ok: true, parish: await getOwnParish(req.user) })
})

router.patch('/', async (req, res) => {
  res.json({ ok: true, parish: await editOwnParish(req.user, req.body ?? {}) })
})

router.get('/priests', async (req, res) => {
  res.json({ ok: true, priests: await getActivePriests(req.user) })
})

router.post('/photo', upload, async (req, res) => {
  res.status(201).json({
    ok: true,
    parish: await setPhoto(req.user, {
      buffer: req.body,
      typeAccepted: req.is(PHOTO_TYPES) !== false,
    }),
  })
})

router.delete('/photo', async (req, res) => {
  res.json({ ok: true, parish: await removePhoto(req.user) })
})

router.post('/seal', sealUpload, async (req, res) => {
  res.status(201).json({
    ok: true,
    parish: await setSeal(req.user, {
      buffer: req.body,
      typeAccepted: req.is(SEAL_TYPES) !== false,
    }),
  })
})

router.delete('/seal', async (req, res) => {
  res.json({ ok: true, parish: await removeSeal(req.user) })
})

router.get('/gallery', async (req, res) => {
  res.json({ ok: true, images: await getGallery(req.user) })
})

router.post('/gallery', galleryUpload, async (req, res) => {
  res.status(201).json({
    ok: true,
    images: await addGalleryImage(req.user, {
      fileName: req.get('X-File-Name'),
      buffer: req.body,
      typeAccepted: req.is(GALLERY_TYPES) !== false,
    }),
  })
})

router.delete('/gallery/:imageId', async (req, res) => {
  res.json({ ok: true, images: await removeGalleryImage(req.user, req.params.imageId) })
})

router.post('/facebook-token', async (req, res) => {
  res.json({ ok: true, parish: await setPageToken(req.user, req.body ?? {}) })
})

router.delete('/facebook-token', async (req, res) => {
  res.json({ ok: true, parish: await removePageToken(req.user) })
})

router.get('/facebook/connect-url', async (req, res) => {
  res.json({ ok: true, ...(await getFacebookConnectUrl(req.user)) })
})

router.post('/facebook/connect', async (req, res) => {
  res.json({ ok: true, parish: await connectFacebookPage(req.user, req.body ?? {}) })
})

export default router