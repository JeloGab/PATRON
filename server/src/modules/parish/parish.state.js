// The signed `state` parameter for the Facebook connect flow.

import 'dotenv/config'
import { createHmac } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { AppError } from '../../lib/appError.js'

const base = process.env.JWT_SECRET
if (!base) throw new Error('JWT_SECRET is not defined in .env')

// A SEPARATE key, derived from JWT_SECRET rather than reusing it. Signing the state
// with JWT_SECRET itself would make the two token types interchangeable: a state token
// carries `sub` = userId, so verifyToken() would accept it as a session Bearer token -
// and this one travels through a URL, past Facebook, and into the browser's address bar
// and history.
const secret = createHmac('sha256', base).update('facebook-connect-state').digest('hex')

const TTL = '10m'

export function signConnectState({ userId, parishId }) {
  return jwt.sign({ parishId }, secret, { subject: userId, expiresIn: TTL })
}

// What this defends against: an attacker causing the priest's browser to deliver the
// ATTACKER'S code to PATRON, which would connect the attacker's page to the parish.
// They cannot mint a state, so they cannot. It is NOT replay protection - that comes
// free, because an OAuth code is single-use at Facebook.
export function verifyConnectState(value, actor) {
  let payload
  try {
    payload = jwt.verify(String(value ?? ''), secret)
  } catch {
    throw new AppError('INVALID_CONNECT_STATE', 400)
  }
  if (payload.sub !== actor.userId) throw new AppError('INVALID_CONNECT_STATE', 400)
  if (payload.parishId !== actor.parishId) throw new AppError('INVALID_CONNECT_STATE', 400)
}
