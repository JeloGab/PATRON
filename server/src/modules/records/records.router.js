import { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { searchRecords, getRecord, createRecord, editRecord, editSubject, } from './records.services.js'

const router = Router()

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

export default router