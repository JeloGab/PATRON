import { pool } from '../../db/pool.js'
import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const COLUMNS = `a.application_id, a.parish_id, a.document_type_id, a.record_id, a.applicant_id,
                 a.requestor_name, a.requestor_contact, a.relationship, a.purpose,
                 a.subject_name, a.subject_birth_date, a.father_name, a.mother_name,
                 a.sacrament_year, a.notes, a.status, a.status_reason,
                 a.is_paid, a.paid_at, a.created_by, a.submitted_at,
                 a.verified_by, a.verified_at, a.approved_by, a.approved_at,
                 a.rejected_by, a.rejected_at, a.cancelled_by, a.cancelled_at,
                 t.name as document_name, t.record_type,
                 p.name as parish_name,
                 creator.full_name as created_by_name,
                 verifier.full_name as verified_by_name,
                 approver.full_name as approved_by_name,
                 r.book_no, r.page_no, r.entry_no, r.record_date`

// parish_directory, not parish: a parishioner has no parish, so `parish` answers
// them zero rows and an INNER join here would delete their own requests from the
// result. The directory view is security_invoker = off, so it reads for anyone.
// Every other join is LEFT for the same reason — a parishioner cannot see staff
// rows or the register, and those columns simply arrive null for them.
const SOURCE = `from public.document_application a
                join public.document_type t on t.type_id = a.document_type_id
                left join public.parish_directory p on p.parish_id = a.parish_id
                left join public.app_user creator on creator.user_id = a.created_by
                left join public.app_user verifier on verifier.user_id = a.verified_by
                left join public.app_user approver on approver.user_id = a.approved_by
                left join public.sacramental_record r on r.record_id = a.record_id`

function mapApplication(row) {
  return {
    applicationId: row.application_id,
    parishId: row.parish_id,
    parishName: row.parish_name,
    documentTypeId: row.document_type_id,
    documentName: row.document_name,
    recordType: row.record_type,
    recordId: row.record_id,
    bookNo: row.book_no,
    pageNo: row.page_no,
    entryNo: row.entry_no,
    recordDate: row.record_date,
    applicantId: row.applicant_id,
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
    paidAt: row.paid_at,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    submittedAt: row.submitted_at,
    verifiedBy: row.verified_by,
    verifiedByName: row.verified_by_name,
    verifiedAt: row.verified_at,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at,
  }
}

function mapWriteError(err) {
  if (err.code === '42501') return new AppError('FORBIDDEN', 403)
  if (err.code === '23503') return new AppError('NOT_FOUND', 404)
  return err
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

// pool.query, not withActor: document_type is not tenant-scoped, and its policy is
// `using (true)`. The same exception the login lookups and public views use.
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

// The public directory view again: a parishioner filing a request must be able to
// name a parish they are not a member of. Absent here means missing OR deactivated —
// the view filters to active — so the caller reports one code for both.
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
      // RETURNING applies SELECT policies to the new row. It works here because both
      // filers can see what they just wrote — a parishioner through the applicant
      // policy, a manager through the parish policy. That is NOT true everywhere:
      // parishioner signup has no session and must read back through a lookup.
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

// Every update below returns rowCount, and the service treats 0 as 404/409 — a
// failing RLS `using` clause changes zero rows and raises nothing at all.
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

// Which register a record belongs to. RLS scopes it to the caller's parish, so a
// record from another parish reads as "not found" rather than as a mismatch.
export async function findRecordType(actor, recordId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select record_type from public.sacramental_record where record_id = $1`,
      [recordId]
    )
    return rows.length === 0 ? null : rows[0].record_type
  })
}