import express, { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { getOwnParish, editOwnParish, getActivePriests, setPhoto, removePhoto, PHOTO_TYPES } from './parish.services.js'

const router = Router()

const upload = express.raw({ type: PHOTO_TYPES, limit: '2mb' })

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

router.get('/', async (req, res) => {
  res.json({ ok: true, parish: await getOwnParish(req.user) })
})

router.patch('/', async (req, res) => {
  res.json({ ok: true, parish: await editOwnParish(req.user, req.body ?? {}) })
})

router.get('/priests', async (req, res) => {
  res.json({ ok: true, priests: await getActivePriests(req.user) })
})

router.post('/photo', upload, async (req, res) => {
  res.status(201).json({
    ok: true,
    parish: await setPhoto(req.user, {
      buffer: req.body,
      typeAccepted: req.is(PHOTO_TYPES) !== false,
    }),
  })
})

router.delete('/photo', async (req, res) => {
  res.json({ ok: true, parish: await removePhoto(req.user) })
})

export default router