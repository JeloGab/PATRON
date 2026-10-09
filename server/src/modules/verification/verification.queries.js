import { pool } from '../../db/pool.js'

export async function findVerification(code) {
  const { rows } = await pool.query(
    `select verification_code, document_name, subject_name, parish_name, issued_on
       from public.certificate_verification
      where verification_code = $1`,
    [code]
  )
  if (rows.length === 0) return null
  return {
    verificationCode: rows[0].verification_code,
    documentName: rows[0].document_name,
    subjectName: rows[0].subject_name,
    parishName: rows[0].parish_name,
    issuedOn: rows[0].issued_on,
  }
}