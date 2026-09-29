import { pool } from '../../db/pool.js'
import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const COLUMNS = `a.application_id, a.parish_id, a.record_id, a.applicant_id,
                 a.requestor_name, a.requestor_contact, a.relationship, a.purpose,
                 a.subject_name, a.subject_birth_date, a.father_name, a.mother_name,
                 a.sacrament_year, a.notes, a.status, a.status_reason, a.is_paid,
                 a.submitted_at, a.verified_at, a.approved_at,
                 coalesce(a.rejected_at, a.cancelled_at) as closed_at,
                 t.name as document_name, t.record_type,
                 p.name as parish_name,
                 creator.full_name as created_by_name,
                 verifier.full_name as verified_by_name,
                 approver.full_name as approved_by_name,
                 closer.full_name as closed_by_name,
                 r.book_no, r.page_no, r.entry_no, r.record_date`


const SOURCE = `from public.document_application a
                join public.document_type t on t.type_id = a.document_type_id
                left join public.parish_directory p on p.parish_id = a.parish_id
                left join public.app_user creator on creator.user_id = a.created_by
                left join public.app_user verifier on verifier.user_id = a.verified_by
                left join public.app_user approver on approver.user_id = a.approved_by
                left join public.app_user closer
                       on closer.user_id = coalesce(a.rejected_by, a.cancelled_by)
                left join public.sacramental_record r on r.record_id = a.record_id`

const CERT_COLUMNS = `f.file_id, f.application_id, f.release_type, f.verification_code,
                      f.snapshot, f.issued_at, t.name as document_name`

const CERT_SOURCE = `from public.document_file f
                     join public.document_type t on t.type_id = f.document_type_id`

function mapApplication(row) {
  return {
    applicationId: row.application_id,
    parishId: row.parish_id,
    parishName: row.parish_name,
    documentName: row.document_name,
    recordType: row.record_type,
    recordId: row.record_id,
    bookNo: row.book_no,
    pageNo: row.page_no,
    entryNo: row.entry_no,
    recordDate: row.record_date,
    isWalkIn: row.applicant_id === null,
    requestorName: row.requestor_name,
    requestorContact: row.requestor_contact,
    relationship: row.relationship,
    purpose: row.purpose,
    subjectName: row.subject_name,
    subjectBirthDate: row.subject_birth_date,
    fatherName: row.father_name,
    motherName: row.mother_name,
    sacramentYear: row.sacrament_year,
    notes: row.notes,
    status: row.status,
    statusReason: row.status_reason,
    isPaid: row.is_paid,
    createdByName: row.created_by_name,
    submittedAt: row.submitted_at,
    verifiedByName: row.verified_by_name,
    verifiedAt: row.verified_at,
    approvedByName: row.approved_by_name,
    approvedAt: row.approved_at,
    closedByName: row.closed_by_name,
    closedAt: row.closed_at,
  }
}

function mapWriteError(err) {
   if (err.code === '23505' && err.constraint === 'document_file_verification_code_key') {
    return new AppError('VERIFICATION_CODE_TAKEN', 409)
  }
  if (err.code === '42501') return new AppError('FORBIDDEN', 403)
  if (err.code === '23503') return new AppError('NOT_FOUND', 404)
  return err
}

function mapCertificate(row) {
  return {
    certificateId: row.file_id,
    applicationId: row.application_id,
    documentName: row.document_name,
    releaseType: row.release_type,
    verificationCode: row.verification_code,
    snapshot: row.snapshot,
    issuedAt: row.issued_at,
  }
}

/* ── document types: global, non-tenant, read-only ─────────────────────── */

function mapType(row) {
  return {
    documentTypeId: row.type_id,
    name: row.name,
    description: row.description,
    recordType: row.record_type,
    availability: row.availability,
  }
}

export async function findDocumentTypes() {
  const { rows } = await pool.query(
    `select type_id, name, description, record_type, availability
       from public.document_type
      where availability
      order by name`
  )
  return rows.map(mapType)
}

export async function findDocumentType(typeId) {
  const { rows } = await pool.query(
    `select type_id, name, description, record_type, availability
       from public.document_type
      where type_id = $1`,
    [typeId]
  )
  return rows.length === 0 ? null : mapType(rows[0])
}

export async function findActiveParish(parishId) {
  const { rows } = await pool.query(
    `select parish_id, name from public.parish_directory where parish_id = $1`,
    [parishId]
  )
  return rows.length === 0 ? null : { parishId: rows[0].parish_id, name: rows[0].name }
}

/* ── applications ──────────────────────────────────────────────────────── */

export async function findApplication(actor, applicationId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE} where a.application_id = $1`,
      [applicationId]
    )
    return rows.length === 0 ? null : mapApplication(rows[0])
  })
}

export async function findApplications(actor, { status, page, pageSize }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE}
        where ($1::text is null or a.status = $1)
        order by a.submitted_at desc
        limit $2 offset $3`,
      [status, pageSize + 1, (page - 1) * pageSize]
    )
    return {
      requests: rows.slice(0, pageSize).map(mapApplication),
      page,
      hasMore: rows.length > pageSize,
    }
  })
}

export async function insertApplication(actor, application) {
  return withActor(actor, async (client) => {
    try {
      const { rows } = await client.query(
        `insert into public.document_application
           (parish_id, document_type_id, applicant_id, requestor_name, requestor_contact,
            relationship, purpose, subject_name, subject_birth_date, father_name,
            mother_name, sacrament_year, notes, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         returning application_id`,
        [
          application.parishId,
          application.documentTypeId,
          application.applicantId,
          application.requestorName,
          application.requestorContact,
          application.relationship,
          application.purpose,
          application.subjectName,
          application.subjectBirthDate,
          application.fatherName,
          application.motherName,
          application.sacramentYear,
          application.notes,
          application.createdBy,
        ]
      )
      return rows[0].application_id
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function attachRecord(actor, applicationId, recordId, verifierId) {
  return withActor(actor, async (client) => {
    try {
      const { rowCount } = await client.query(
        `update public.document_application
            set record_id = $2, status = 'verified',
                verified_by = $3, verified_at = now()
          where application_id = $1
            and status in ('pending', 'verified')`,
        [applicationId, recordId, verifierId]
      )
      return rowCount
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function markPaid(actor, applicationId) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.document_application
          set is_paid = true, paid_at = now()
        where application_id = $1
          and status in ('pending', 'verified')
          and is_paid = false`,
      [applicationId]
    )
    return rowCount
  })
}

export async function rejectApplication(actor, applicationId, reason, rejectedBy) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.document_application
          set status = 'rejected', status_reason = $2,
              rejected_by = $3, rejected_at = now()
        where application_id = $1
          and status in ('pending', 'verified')`,
      [applicationId, reason, rejectedBy]
    )
    return rowCount
  })
}

export async function cancelApplication(actor, applicationId, reason) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.document_application
          set status = 'cancelled', status_reason = $2,
              cancelled_by = $3, cancelled_at = now()
        where application_id = $1
          and status = 'pending'`,
      [applicationId, reason, actor.userId]
    )
    return rowCount
  })
}

export async function findRecordType(actor, recordId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select record_type from public.sacramental_record where record_id = $1`,
      [recordId]
    )
    return rows.length === 0 ? null : rows[0].record_type
  })
}

export async function findCertificate(actor, applicationId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${CERT_COLUMNS} ${CERT_SOURCE} where f.application_id = $1`,
      [applicationId]
    )
    return rows.length === 0 ? null : mapCertificate(rows[0])
  })
}


export async function issueCertificate(actor, { applicationId, verificationCode, buildSnapshot }) {
  return withActor(actor, async (client) => {
    try {
      const approved = await client.query(
        `update public.document_application
            set status = 'approved', approved_by = $2, approved_at = now()
          where application_id = $1
            and status = 'verified'
          returning record_id, document_type_id, purpose`,
        [applicationId, actor.userId]
      )
      
      if (approved.rowCount === 0) return null

      const { record_id: recordId, document_type_id: documentTypeId, purpose } = approved.rows[0]

      const { rows: recordRows } = await client.query(
        `select r.record_type, r.book_no, r.page_no, r.entry_no, r.record_date,
                r.date_of_death, r.officiant_name,
                p.name as parish_name, p.address as parish_address, p.contact_no as parish_contact,
                t.name as document_name,
                me.full_name as signatory_name
           from public.sacramental_record r
           join public.parish p on p.parish_id = r.parish_id
           join public.document_type t on t.type_id = $2
           join public.app_user me on me.user_id = public.current_user_id()
          where r.record_id = $1`,
        [recordId, documentTypeId]
      )
      if (recordRows.length === 0) throw new AppError('RECORD_NOT_FOUND', 404)

      const { rows: subjectRows } = await client.query(
        `select role, full_name, date_of_birth, place_of_birth, gender,
                father_name, mother_name, sponsor_names
           from public.record_subject
          where record_id = $1`,
        [recordId]
      )

      const snapshot = buildSnapshot({ record: recordRows[0], subjects: subjectRows, purpose })

      const { rows } = await client.query(
        `insert into public.document_file
           (parish_id, document_type_id, record_id, application_id, release_type,
            verification_code, snapshot, signatory_id, issued_by)
         values ($1, $2, $3, $4, 'request', $5, $6, $7, $7)
         returning file_id`,
        [
          actor.parishId,
          documentTypeId,
          recordId,
          applicationId,
          verificationCode,
          JSON.stringify(snapshot),
          actor.userId,
        ]
      )
      return rows[0].file_id
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function countRecordDocuments(actor, recordId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select
         (select count(*) from public.document_application where record_id = $1) as request_count,
         (select count(*) from public.document_file where record_id = $1) as issued_count`,
      [recordId]
    )
    return {
      requestCount: Number(rows[0].request_count),
      issuedCount: Number(rows[0].issued_count),
    }
  })
}

