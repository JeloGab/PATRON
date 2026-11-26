// The signed `state` parameter for the Facebook connect flow.

import 'dotenv/config'
import { createHmac } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { AppError } from '../../lib/appError.js'

const base = process.env.JWT_SECRET
if (!base) throw new Error('JWT_SECRET is not defined in .env')

const secret = createHmac('sha256', base).update('facebook-connect-state').digest('hex')

const TTL = '10m'

export function signConnectState({ userId, parishId }) {
  return jwt.sign({ parishId }, secret, { subject: userId, expiresIn: TTL })
}

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
