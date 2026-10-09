import { Router } from 'express'
import { AppError } from '../../lib/appError.js'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import {
  createParish,
  getParishes,
  provisionPriest,
  getPriests,
  setPriestStatus,
  resetPriestPassword,
} from './admin.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('sysadmin'))

router.post('/parishes', async (req, res) => {
  const { name, address, contactNo, email, facebookPageId } = req.body ?? {}
  if (!name || !address || !contactNo) throw new AppError('MISSING_FIELDS', 400)

  res.status(201).json({
    ok: true,
    parish: await createParish({ name, address, contactNo, email, facebookPageId }),
  })
})

router.get('/parishes', async (_req, res) => {
  res.json({ ok: true, parishes: await getParishes() })
})

router.post('/priests', async (req, res) => {
  const { fullName, parishId, username } = req.body ?? {}
  if (!fullName || !parishId) throw new AppError('MISSING_FIELDS', 400)

  res.status(201).json({
    ok: true,
    ...(await provisionPriest({ fullName, parishId, username })),
  })
})

router.get('/priests', async (req, res) => {
  res.json({ ok: true, priests: await getPriests(req.query.parishId) })
})

router.post('/priests/:userId/deactivate', async (req, res) => {
  res.json({
    ok: true,
    user: await setPriestStatus({ userId: req.params.userId, status: 'inactive' }, req.user),
  })
})

router.post('/priests/:userId/reactivate', async (req, res) => {
  res.json({
    ok: true,
    user: await setPriestStatus({ userId: req.params.userId, status: 'active' }, req.user),
  })
})

router.post('/priests/:userId/reset-password', async (req, res) => {
  res.json({ ok: true, ...(await resetPriestPassword(req.params.userId)) })
})

export default router