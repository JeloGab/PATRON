import { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { createEvent, listEvents, getEvent, editEvent, approveEvent, rejectEvent, cancelEvent, completeEvent } from './events.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

const managerOnly = requireRole('manager')
const priestOnly = requireRole('priest')

router.get('/', async (req, res) => {
  res.json({ ok: true, events: await listEvents(req.user, req.query) })
})

router.get('/:eventId', async (req, res) => {
  res.json({ ok: true, event: await getEvent(req.user, req.params.eventId) })
})

router.post('/', managerOnly, async (req, res) => {
  res.status(201).json({ ok: true, event: await createEvent(req.user, req.body ?? {}) })
})

router.patch('/:eventId', managerOnly, async (req, res) => {
  res.json({ ok: true, event: await editEvent(req.user, req.params.eventId, req.body ?? {}) })
})

router.post('/:eventId/approve', priestOnly, async (req, res) => {
  res.json({ ok: true, event: await approveEvent(req.user, req.params.eventId) })
})

router.post('/:eventId/reject', priestOnly, async (req, res) => {
  res.json({ ok: true, event: await rejectEvent(req.user, req.params.eventId, req.body ?? {}) })
})

router.post('/:eventId/cancel', managerOnly, async (req, res) => {
  res.json({ ok: true, event: await cancelEvent(req.user, req.params.eventId, req.body ?? {}) })
})

router.post('/:eventId/complete', managerOnly, async (req, res) => {
  const { event, warnings } = await completeEvent(req.user, req.params.eventId)
  res.json({ ok: true, event, warnings })
})

export default router