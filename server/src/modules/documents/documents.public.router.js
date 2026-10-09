import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { listDocumentTypes } from './documents.services.js'

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(publicLimiter)

router.get('/', async (_req, res) => {
  res.json({ ok: true, documentTypes: await listDocumentTypes() })
})


export default router