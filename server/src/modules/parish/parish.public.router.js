import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getParishDirectory, getPublicParish } from './parish.services.js'

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

export default router