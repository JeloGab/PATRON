import { clean } from '../../lib/validators.js'
import { findVerification } from './verification.queries.js'


const CODE_PATTERN = /^[A-Z2-7]{12}$/

export async function verifyCertificate(code) {
  const cleaned = clean(code).toUpperCase().replace(/[\s-]/g, '')
  if (!CODE_PATTERN.test(cleaned)) return { valid: false }

  const certificate = await findVerification(cleaned)
  return certificate ? { valid: true, certificate } : { valid: false }
}