import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { verifyCertificate } from './verification.services.js'

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(publicLimiter)

router.get('/:code', async (req, res) => {
  res.json({ ok: true, ...(await verifyCertificate(req.params.code)) })
})

export default router