import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getParishDirectory, getPublicParish, getPublicPhoto, getPublicClergyPhoto, getPublicSeal, getPublicGalleryImage } from './parish.services.js'
import { getParishFeed } from '../announcements/announcements.services.js'

const directoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(directoryLimiter)

router.get('/', async (_req, res) => {
  res.json({ ok: true, parishes: await getParishDirectory() })
})

router.get('/:parishId', async (req, res) => {
  res.json({ ok: true, parish: await getPublicParish(req.params.parishId) })
})

router.get('/:parishId/photo', async (req, res) => {
  const photo = await getPublicPhoto(req.params.parishId)
  res.type(photo.contentType)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.send(photo.content)
})

router.get('/:parishId/seal', async (req, res) => {
  const seal = await getPublicSeal(req.params.parishId)
  res.type(seal.contentType)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.send(seal.content)
})

router.get('/:parishId/gallery/:imageId', async (req, res) => {
  const image = await getPublicGalleryImage(req.params.parishId, req.params.imageId)
  res.type(image.contentType)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.send(image.content)
})

router.get('/:parishId/announcements', async (req, res) => {
  res.json({ ok: true, ...(await getParishFeed(req.params.parishId, req.query)) })
})

router.get('/:parishId/priests/:userId/photo', async (req, res) => {
  const photo = await getPublicClergyPhoto(req.params.parishId, req.params.userId)
  res.type(photo.contentType)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.send(photo.content)
})

export default router