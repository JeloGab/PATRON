import { verifyToken } from './auth.token.js'
import { checkSession } from './auth.queries.js'

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, code: 'NO_TOKEN' })
  }

  let claims
  try {
    claims = verifyToken(token)
  } catch {
    return res.status(401).json({ ok: false, code: 'INVALID_TOKEN' })
  }

  const session = await checkSession(claims.userId)

  if (!session || session.status !== 'active') {
    return res.status(401).json({ ok: false, code: 'SESSION_REVOKED' })
  }

  if (
    session.passwordChangedAt &&
    claims.issuedAt < Math.floor(session.passwordChangedAt.getTime() / 1000)
  ) {
    return res.status(401).json({ ok: false, code: 'SESSION_REVOKED' })
  }

  req.user = {
    userId: claims.userId,
    role: session.role,
    parishId: session.parishId,
    mustChangePassword: session.mustChangePassword,
  }

  next()
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


