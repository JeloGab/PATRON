import { verifyToken } from './auth.token.js'

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, code: 'NO_TOKEN' })
  }

  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ ok: false, code: 'INVALID_TOKEN' })
  }
}

export function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ ok: false, code: 'PASSWORD_CHANGE_REQUIRED' })
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ ok: false, code: 'FORBIDDEN' })
    }
    next()
  }
}