import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import {
  attachRecord,
  fileWalkIn,
  getApplication,
  listApplications,
  markPaid,
  rejectApplication,
} from './documents.services.js'

// Manuscript §1.4: submission endpoints are rate-limited. Wired from the start here
// rather than added later, the way /api/events still owes one.
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

const managerOnly = requireRole('manager')

router.post('/walk-in', managerOnly, submissionLimiter, async (req, res) => {
  res.status(201).json({ ok: true, request: await fileWalkIn(req.user, req.body ?? {}) })
})

router.get('/', async (req, res) => {
  res.json({ ok: true, ...(await listApplications(req.user, req.query)) })
})

router.get('/:applicationId', async (req, res) => {
  res.json({ ok: true, request: await getApplication(req.user, req.params.applicationId) })
})

router.patch('/:applicationId/record', managerOnly, async (req, res) => {
  res.json({ ok: true, request: await attachRecord(req.user, req.params.applicationId, req.body ?? {}) })
})

router.post('/:applicationId/paid', managerOnly, async (req, res) => {
  res.json({ ok: true, request: await markPaid(req.user, req.params.applicationId) })
})

router.post('/:applicationId/reject', async (req, res) => {
  res.json({ ok: true, request: await rejectApplication(req.user, req.params.applicationId, req.body ?? {}) })
})

export default router