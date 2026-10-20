import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { getParishCalendar } from './events.services.js'

const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(calendarLimiter)

router.use(requireAuth, requirePasswordChanged, requireRole('parishioner'))

router.get('/', async (req, res) => {
  res.json({ ok: true, ...(await getParishCalendar(req.query)) })
})

export default router
