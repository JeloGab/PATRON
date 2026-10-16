import express, { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { attachRecord, fileWalkIn, getApplication, listApplications, markPaid, rejectApplication, } from './documents.services.js'
import {approveApplication, getCertificate, getCertificatePdf} from './documents.services.js'
import { attachIdFile, getIdFile } from './documents.services.js'
import { ATTACHMENT_TYPES } from '../../lib/fileType.js'

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
const priestOnly = requireRole('priest')

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

router.post('/:applicationId/approve', priestOnly, async (req, res) => {
  res.json({ ok: true, ...(await approveApplication(req.user, req.params.applicationId)) })
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


const idUpload = express.raw({ type: ATTACHMENT_TYPES, limit: '5mb' })

router.post('/:applicationId/id-file', managerOnly, idUpload, async (req, res) => {
  const request = await attachIdFile(req.user, req.params.applicationId, {
    fileName: req.get('x-file-name'),
    buffer: req.body,
    typeAccepted: req.is(ATTACHMENT_TYPES) !== false,
  })
  res.status(201).json({ ok: true, request })
})

router.get('/:applicationId/id-file', async (req, res) => {
  const file = await getIdFile(req.user, req.params.applicationId)
  res.type(file.contentType)
  res.set('Content-Disposition', `inline; filename="${file.fileName}"`)
  res.send(file.content)
})

export default router