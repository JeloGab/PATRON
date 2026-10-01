import { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { addParticipant, listParticipants, getParticipant, editParticipant, withdrawParticipant, listRequirements, decideRequirement } from './participants.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

const managerOnly = requireRole('manager')

router.get('/', async (req, res) => {
  res.json({ ok: true, participants: await listParticipants(req.user, req.query) })
})

router.get('/:participantId', async (req, res) => {
  res.json({ ok: true, participant: await getParticipant(req.user, req.params.participantId) })
})

router.post('/', managerOnly, async (req, res) => {
  res.status(201).json({ ok: true, participant: await addParticipant(req.user, req.body ?? {}) })
})

router.patch('/:participantId', managerOnly, async (req, res) => {
  res.json({ ok: true, participant: await editParticipant(req.user, req.params.participantId, req.body ?? {}) })
})

router.post('/:participantId/withdraw', managerOnly, async (req, res) => {
  res.json({ ok: true, participant: await withdrawParticipant(req.user, req.params.participantId) })
})

router.get('/:participantId/requirements', async (req, res) => {
  res.json({ ok: true, requirements: await listRequirements(req.user, req.params.participantId) })
})

router.patch('/:participantId/requirements/:requirementId', managerOnly, async (req, res) => {
  const requirements = await decideRequirement(
    req.user,
    req.params.participantId,
    req.params.requirementId,
    req.body ?? {},
  )
  res.json({ ok: true, requirements })
})

export default router