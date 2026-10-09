import { AppError } from '../lib/appError.js'

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, code: err.code })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, code: 'MALFORMED_JSON' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, code: 'FILE_TOO_LARGE' })
  }  
  console.error(err)
  res.status(500).json({ ok: false, code: 'INTERNAL_ERROR' })
}