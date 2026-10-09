import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { cancelRequest, fileRequest, getMyRequest, listMyRequests, getCertificate, getCertificatePdf } from './documents.services.js'

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

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

router.get('/:applicationId/certificate', async (req, res) => {
  res.json({ ok: true, certificate: await getCertificate(req.user, req.params.applicationId) })
})

router.get('/:applicationId/certificate.pdf', async (req, res) => {
  const file = await getCertificatePdf(req.user, req.params.applicationId)
  res.type('application/pdf')
  res.set('Content-Disposition', `inline; filename="${file.fileName}"`)
  res.send(file.buffer)
})

export default router