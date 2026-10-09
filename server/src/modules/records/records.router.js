import express, { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { searchRecords, getRecord, createRecord, editRecord, editSubject,  attachPhoto, getAttachment, removeAttachment } from './records.services.js'
import { ATTACHMENT_TYPES } from '../../lib/fileType.js'

const router = Router()
const upload = express.raw({ type: ATTACHMENT_TYPES, limit: '5mb' })

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

const managerOnly = requireRole('manager')

router.get('/', async (req, res) => {
  res.json({ ok: true, ...(await searchRecords(req.user, req.query)) })
})

router.get('/:recordId', async (req, res) => {
  res.json({ ok: true, record: await getRecord(req.user, req.params.recordId) })
})

router.post('/', managerOnly, async (req, res) => {
  res.status(201).json({ ok: true, record: await createRecord(req.user, req.body ?? {}) })
})

router.patch('/:recordId', managerOnly, async (req, res) => {
  res.json({ ok: true, record: await editRecord(req.user, req.params.recordId, req.body ?? {}) })
})

router.patch('/:recordId/subjects/:subjectId', managerOnly, async (req, res) => {
  const { recordId, subjectId } = req.params
  res.json({ ok: true, record: await editSubject(req.user, { recordId, subjectId }, req.body ?? {}) })
})

router.post('/:recordId/attachments', managerOnly, upload, async (req, res) => {
  const record = await attachPhoto(req.user, req.params.recordId, {
    fileName: req.get('x-file-name'),
    buffer: req.body,
    typeAccepted: req.is(ATTACHMENT_TYPES) !== false,
  })
  res.status(201).json({ ok: true, record })
})

router.get('/:recordId/attachments/:attachmentId', async (req, res) => {
  const { recordId, attachmentId } = req.params
  const file = await getAttachment(req.user, { recordId, attachmentId })
  res.type(file.contentType)
  res.set('Content-Disposition', `inline; filename="${file.fileName}"`)
  res.send(file.content)
})

router.delete('/:recordId/attachments/:attachmentId', managerOnly, async (req, res) => {
  const { recordId, attachmentId } = req.params
  res.json({ ok: true, record: await removeAttachment(req.user, { recordId, attachmentId }) })
})

export default router