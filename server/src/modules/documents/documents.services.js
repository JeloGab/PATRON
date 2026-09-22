import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import {
  clean,
  optionalContact,
  optionalDescription,
  optionalPastDate,
  optionalReason,
  optionalSacramentYear,
  optionalSubjectName,
  requireFullName,
  requirePurpose,
  requireRelationship,
  requireSubjectName,
} from '../../lib/validators.js'
import {
  attachRecord as attachRecordRow,
  cancelApplication,
  findActiveParish,
  findApplication,
  findApplications,
  findDocumentType,
  findDocumentTypes,
  findRecordType,
  insertApplication,
  markPaid as markPaidRow,
  rejectApplication as rejectApplicationRow,
} from './documents.queries.js'

const PAGE_SIZE = 50
const STATUSES = ['pending', 'verified', 'approved', 'rejected', 'cancelled']
// pending and verified are the working statuses: everything a manager may still do
// happens in one of them. approved, rejected and cancelled are final.
const OPEN_STATUSES = ['pending', 'verified']

function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}

// The identifying fields, identical for both ways of filing. A parishioner never
// searches records, so these are what a manager searches the ledger with.
function requestFields(body) {
  return {
    relationship: requireRelationship(body.relationship),
    purpose: requirePurpose(body.purpose),
    subjectName: requireSubjectName(body.subjectName),
    subjectBirthDate: optionalPastDate(body.subjectBirthDate, 'INVALID_BIRTH_DATE'),
    fatherName: optionalSubjectName(body.fatherName),
    motherName: optionalSubjectName(body.motherName),
    sacramentYear: optionalSacramentYear(body.sacramentYear),
    notes: optionalDescription(body.notes),
  }
}

async function requireDocumentType(value) {
  const type = await findDocumentType(requireId(value, 'INVALID_DOCUMENT_TYPE'))
  if (!type) throw new AppError('INVALID_DOCUMENT_TYPE', 400)
  if (!type.availability) throw new AppError('DOCUMENT_TYPE_UNAVAILABLE', 409)
  return type
}

async function requireApplication(actor, applicationId) {
  const application = await findApplication(actor, requireId(applicationId, 'INVALID_APPLICATION_ID'))
  if (!application) throw new AppError('APPLICATION_NOT_FOUND', 404)
  return application
}

export async function listDocumentTypes() {
  return findDocumentTypes()
}

/* ── filing ────────────────────────────────────────────────────────────── */

export async function fileRequest(actor, body) {
  const parishId = requireId(body.parishId, 'INVALID_PARISH_ID')
  // The directory holds active parishes only, so a deactivated one is indistinguishable
  // from a missing one here — one code for both, by design (a parishioner has no
  // business learning that a parish exists but is closed).
  if (!(await findActiveParish(parishId))) throw new AppError('PARISH_NOT_FOUND', 404)
  const type = await requireDocumentType(body.documentTypeId)

  const applicationId = await insertApplication(actor, {
    ...requestFields(body),
    parishId,
    documentTypeId: type.documentTypeId,
    applicantId: actor.userId,
    requestorName: null,
    requestorContact: null,
    createdBy: actor.userId,
  })
  return findApplication(actor, applicationId)
}

export async function fileWalkIn(actor, body) {
  const type = await requireDocumentType(body.documentTypeId)

  const applicationId = await insertApplication(actor, {
    ...requestFields(body),
    parishId: actor.parishId,
    documentTypeId: type.documentTypeId,
    applicantId: null,
    requestorName: requireFullName(body.requestorName),
    requestorContact: optionalContact(body.requestorContact),
    createdBy: actor.userId,
  })
  return findApplication(actor, applicationId)
}

/* ── the parishioner's own requests ────────────────────────────────────── */

export async function listMyRequests(actor) {
  const { requests } = await findApplications(actor, { status: null, page: 1, pageSize: PAGE_SIZE })
  return requests
}

export async function getMyRequest(actor, applicationId) {
  return requireApplication(actor, applicationId)
}

export async function cancelRequest(actor, applicationId, body) {
  const application = await requireApplication(actor, applicationId)
  if (application.status !== 'pending') throw new AppError('APPLICATION_NOT_PENDING', 409)

  const changed = await cancelApplication(actor, application.applicationId, optionalReason(body.reason))
  if (changed === 0) throw new AppError('APPLICATION_NOT_PENDING', 409)
  return findApplication(actor, application.applicationId)
}

/* ── the parish queue ──────────────────────────────────────────────────── */

export async function listApplications(actor, query) {
  const status = clean(query.status)
  if (status && !STATUSES.includes(status)) throw new AppError('INVALID_STATUS', 400)
  const page = Math.max(1, Number.parseInt(clean(query.page) || '1', 10) || 1)

  return findApplications(actor, { status: status || null, page, pageSize: PAGE_SIZE })
}

export async function getApplication(actor, applicationId) {
  return requireApplication(actor, applicationId)
}

export async function attachRecord(actor, applicationId, body) {
  const application = await requireApplication(actor, applicationId)
  if (!OPEN_STATUSES.includes(application.status)) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  const recordId = requireId(body.recordId, 'INVALID_RECORD_ID')
  const recordType = await findRecordType(actor, recordId)
  if (!recordType) throw new AppError('RECORD_NOT_FOUND', 404)
  // A baptismal certificate can only be drawn from the baptismal register. The
  // register comes from document_type, which is why that column exists on it.
  if (recordType !== application.recordType) throw new AppError('RECORD_TYPE_MISMATCH', 409)

  const changed = await attachRecordRow(actor, application.applicationId, recordId, actor.userId)
  if (changed === 0) throw new AppError('APPLICATION_NOT_EDITABLE', 409)
  return findApplication(actor, application.applicationId)
}

export async function markPaid(actor, applicationId) {
  const application = await requireApplication(actor, applicationId)
  if (!OPEN_STATUSES.includes(application.status)) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  await markPaidRow(actor, application.applicationId)
  // Deliberately not an error when it was already paid: pressing the button twice
  // should not fail, and the row is already in the state the caller wanted.
  return findApplication(actor, application.applicationId)
}

export async function rejectApplication(actor, applicationId, body) {
  const application = await requireApplication(actor, applicationId)
  // A manager refuses while pending or verified; a priest only at approval time,
  // which is what "verified" means. The policies enforce the same split.
  const allowed = actor.role === 'manager' ? OPEN_STATUSES : ['verified']
  if (!allowed.includes(application.status)) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  const changed = await rejectApplicationRow(
    actor,
    application.applicationId,
    optionalReason(body.reason),
    actor.userId
  )
  if (changed === 0) throw new AppError('APPLICATION_NOT_EDITABLE', 409)
  return findApplication(actor, application.applicationId)
}