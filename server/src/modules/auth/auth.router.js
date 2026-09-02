import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AppError } from '../../lib/appError.js'
import { loginStaff, changePassword, getSelf } from './auth.services.js'
import { requireAuth } from './auth.middleware.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})

const router = Router()

router.post('/staff/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) throw new AppError('MISSING_CREDENTIALS', 400)

  res.json({ ok: true, ...(await loginStaff(username, password)) })
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ ok: true, user: await getSelf(req.user) })
})

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  await changePassword(req.user, currentPassword, newPassword)
  res.json({ ok: true })
})

export default router