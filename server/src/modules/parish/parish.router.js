import { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { getOwnParish, editOwnParish } from './parish.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

router.get('/', async (req, res) => {
  res.json({ ok: true, parish: await getOwnParish(req.user) })
})

router.patch('/', async (req, res) => {
  res.json({ ok: true, parish: await editOwnParish(req.user, req.body ?? {}) })
})

export default router