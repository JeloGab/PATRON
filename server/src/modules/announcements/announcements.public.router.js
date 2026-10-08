import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getPublicFeed, getPublicImage } from './announcements.services.js'

// Higher than the directory's 100: one feed page is 20 announcements and up to
// four images each, so a single visitor scrolling costs dozens of requests.
const feedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(feedLimiter)

router.get('/', async (req, res) => {
  res.json({ ok: true, ...(await getPublicFeed(req.query)) })
})

router.get('/:announcementId/images/:slotNo', async (req, res) => {
  const file = await getPublicImage({
    announcementId: req.params.announcementId,
    slotNo: req.params.slotNo,
  })
  res.type(file.contentType)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.set('Cache-Control', 'public, max-age=300')
  res.send(file.content)
})

export default router