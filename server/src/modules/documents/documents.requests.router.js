import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { cancelRequest, fileRequest, getMyRequest, listMyRequests } from './documents.services.js'

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

// A separate router from the staff one on purpose. One router cannot carry both
// guards without loosening requireRole, and a route added later would then inherit
// the loose guard — the lesson from /api/users and the priest list.
router.use(requireAuth, requirePasswordChanged, requireRole('parishioner'))

router.post('/', submissionLimiter, async (req, res) => {
  res.status(201).json({ ok: true, request: await fileRequest(req.user, req.body ?? {}) })
})

router.get('/', async (req, res) => {
  res.json({ ok: true, requests: await listMyRequests(req.user) })
})

router.get('/:applicationId', async (req, res) => {
  res.json({ ok: true, request: await getMyRequest(req.user, req.params.applicationId) })
})

router.post('/:applicationId/cancel', async (req, res) => {
  res.json({ ok: true, request: await cancelRequest(req.user, req.params.applicationId, req.body ?? {}) })
})

export default router