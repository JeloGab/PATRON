import express, { Router } from 'express'
import { AppError } from '../../lib/appError.js'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { provisionManager, getManagers, setManagerActive, resetManagerPassword, saveSignature, deleteSignature, getSignature, SIGNATURE_TYPES } from './users.services.js'

const router = Router()

const upload = express.raw({ type: SIGNATURE_TYPES, limit: '1mb' })

router.use(requireAuth, requirePasswordChanged, requireRole('priest'))

router.post('/signature', upload, async (req, res) => {
  res.status(201).json({
    ok: true,
    ...(await saveSignature(req.user, {
      buffer: req.body,
      typeAccepted: req.is(SIGNATURE_TYPES) !== false,
    })),
  })
})

router.delete('/signature', async (req, res) => {
  res.json({ ok: true, ...(await deleteSignature(req.user)) })
})

router.get('/signature', async (req, res) => {
  const signature = await getSignature(req.user)
  res.type(signature.contentType)
  res.send(signature.content)
})

router.post('/managers', async (req, res) => {
  const { fullName, username } = req.body ?? {}
  if (!fullName) throw new AppError('MISSING_FIELDS', 400)

  res.status(201).json({ ok: true, ...(await provisionManager(req.user, { fullName, username })) })
})

router.get('/managers', async (req, res) => {
  res.json({ ok: true, managers: await getManagers(req.user) })
})

router.post('/managers/:userId/deactivate', async (req, res) => {
  res.json({
    ok: true,
    user: await setManagerActive(req.user, { userId: req.params.userId, status: 'inactive' }),
  })
})

router.post('/managers/:userId/reactivate', async (req, res) => {
  res.json({
    ok: true,
    user: await setManagerActive(req.user, { userId: req.params.userId, status: 'active' }),
  })
})

router.post('/managers/:userId/reset-password', async (req, res) => {
  res.json({ ok: true, ...(await resetManagerPassword(req.user, req.params.userId)) })
})

export default router