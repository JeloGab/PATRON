import express, { Router } from 'express'
import { AppError } from '../../lib/appError.js'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { createParish, getParishes, setParishStatus, provisionPriest, getPriests, setPriestStatus,resetPriestPassword, saveLogo, removeLogo, getLogo, LOGO_TYPES } from './admin.services.js'

const router = Router()

const logoUpload = express.raw({ type: LOGO_TYPES, limit: '1mb' })

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

router.post('/parishes/:parishId/deactivate', async (req, res) => {
  res.json({
    ok: true,
    parish: await setParishStatus({ parishId: req.params.parishId, status: 'inactive' }, req.user),
  })
})

router.post('/parishes/:parishId/reactivate', async (req, res) => {
  res.json({
    ok: true,
    parish: await setParishStatus({ parishId: req.params.parishId, status: 'active' }, req.user),
  })
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

router.get('/diocese/logo', async (_req, res) => {
  const logo = await getLogo()
  res.type(logo.contentType)
  res.send(logo.content)
})

router.post('/diocese/logo', logoUpload, async (req, res) => {
  res.status(201).json({
    ok: true,
    diocese: await saveLogo(req.user, {
      buffer: req.body,
      typeAccepted: req.is(LOGO_TYPES) !== false,
    }),
  })
})

router.delete('/diocese/logo', async (req, res) => {
  res.json({ ok: true, diocese: await removeLogo(req.user) })
})

export default router