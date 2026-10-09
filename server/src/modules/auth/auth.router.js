import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AppError } from '../../lib/appError.js'
import { loginStaff, changePassword, getSelf,registerParishioner, loginParishioner,requestPasswordReset, completePasswordReset } from './auth.services.js'
import { requireAuth } from './auth.middleware.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'TOO_MANY_ATTEMPTS' },
})
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
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
  res.json({ ok: true, ...(await changePassword(req.user, currentPassword, newPassword)) })
})

router.post('/register', emailLimiter, async (req, res) => {
  const { fullName, email, password } = req.body ?? {}
  res.json({ ok: true, ...(await registerParishioner({ fullName, email, password })) })
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) throw new AppError('MISSING_CREDENTIALS', 400)

  res.json({ ok: true, ...(await loginParishioner({ email, password })) })
})

router.post('/forgot-password', emailLimiter, async (req, res) => {
  const { email } = req.body ?? {}
  if (!email) throw new AppError('MISSING_CREDENTIALS', 400)

  res.json({ ok: true, ...(await requestPasswordReset({ email })) })
})

router.post('/reset-password', loginLimiter, async (req, res) => {
  const { accessToken, newPassword } = req.body ?? {}
  res.json({ ok: true, ...(await completePasswordReset({ accessToken, newPassword })) })
})

export default router