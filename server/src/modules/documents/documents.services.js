import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import {clean, optionalContact, optionalPastDate, optionalReason, optionalSacramentYear, optionalSubjectName, requireFullName, requireInvoiceNo, requirePurpose, requireRelationship, requireSubjectName } from '../../lib/validators.js'
import { attachRecord as attachRecordRow, cancelApplication, findActiveParish, findApplication, findApplications, findDocumentType, findDocumentTypes, findRecordType, insertApplication,markPaid as markPaidRow, rejectApplication as rejectApplicationRow, findCertificate, issueCertificate, findCertificateSignature, hasOwnSignature } from './documents.queries.js'
import {mintVerificationCode} from '../../lib/verificationCode.js'
import { buildCertificatePdf } from './documents.pdf.js'
import { updateIdFile, findIdFile } from './documents.queries.js'
import { sniffContentType, sanitizeFileName, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '../../lib/fileType.js'


const PAGE_SIZE = 50
const STATUSES = ['pending', 'verified', 'approved', 'rejected', 'cancelled']
const MAX_CODE_ATTEMPTS = 5
const SUBJECT_ORDER = { groom: 0, primary: 0, bride: 1, spouse: 1 }
const OPEN_STATUSES = ['pending', 'verified']
const VERIFY_PATH = '/#/verify'
const clientOrigin = process.env.CLIENT_ORIGIN
if (!clientOrigin) throw new Error('.env error')
const VERIFY_BASE = `${clientOrigin.replace(/\/$/, '')}${VERIFY_PATH}`


function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}

function requestFields(body) {
  return {
    relationship: requireRelationship(body.relationship),
    purpose: requirePurpose(body.purpose),
    subjectName: requireSubjectName(body.subjectName),
    subjectBirthDate: optionalPastDate(body.subjectBirthDate, 'INVALID_BIRTH_DATE'),
    fatherName: optionalSubjectName(body.fatherName),
    motherName: optionalSubjectName(body.motherName),
    sacramentYear: optionalSacramentYear(body.sacramentYear),
  }
}

export function buildSnapshot({ record, subjects, purpose = null, releaseType = 'request' }) {
  const people = subjects
    .map((subject) => ({
      role: subject.role,
      fullName: subject.full_name,
      dateOfBirth: subject.date_of_birth,
      placeOfBirth: subject.place_of_birth,
      fatherName: subject.father_name,
      motherName: subject.mother_name,
      sponsorNames: subject.sponsor_names,
    }))
    .sort((a, b) => (SUBJECT_ORDER[a.role] ?? 9) - (SUBJECT_ORDER[b.role] ?? 9))

  return {
    recordType: record.record_type,
    documentName: record.document_name,
    subjectName: people.map((person) => person.fullName).join(' & '),
    subjects: people,
    recordDate: record.record_date,
    dateOfDeath: record.date_of_death,
    bookNo: record.book_no,
    pageNo: record.page_no,
    entryNo: record.entry_no,
    officiantName: record.officiant_name,
    parishName: record.parish_name,
    parishAddress: record.parish_address,
    parishContact: record.parish_contact,
    signatoryName: record.signatory_name,
    purpose,
    releaseType: 'request'
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
  if (!(await findActiveParish(parishId))) throw new AppError('PARISH_NOT_FOUND', 404)
  const type = await requireDocumentType(body.documentTypeId)

  const applicationId = await insertApplication(actor, {
    ...requestFields(body),
    parishId,
    documentTypeId: type.documentTypeId,
    applicantId: actor.userId,
    requestorName: null,
    requestorContact: null,
    invoiceNo: requireInvoiceNo(body.invoiceNo),
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
    invoiceNo: null,
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
  if (recordType !== application.recordType) throw new AppError('RECORD_TYPE_MISMATCH', 409)

  const changed = await attachRecordRow(actor, application.applicationId, recordId, actor.userId)
  if (changed === 0) throw new AppError('APPLICATION_NOT_EDITABLE', 409)
  return findApplication(actor, application.applicationId)
}

export async function markPaid(actor, applicationId) {
  const application = await requireApplication(actor, applicationId)
  if (!OPEN_STATUSES.includes(application.status)) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  await markPaidRow(actor, application.applicationId)
  return findApplication(actor, application.applicationId)
}

export async function rejectApplication(actor, applicationId, body) {
  const application = await requireApplication(actor, applicationId)
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

export async function approveApplication(actor, applicationId) {
  const application = await requireApplication(actor, applicationId)
  if (application.status !== 'verified') throw new AppError('APPLICATION_NOT_VERIFIED', 409)

  // Before the retry loop, or a missing signature costs five transactions.
  if (!(await hasOwnSignature(actor))) throw new AppError('SIGNATURE_REQUIRED', 409)

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const issued = await issueCertificate(actor, {
        applicationId: application.applicationId,
        verificationCode: mintVerificationCode(),
        buildSnapshot,
      })
      if (!issued) throw new AppError('APPLICATION_NOT_VERIFIED', 409)

      return {
        request: await findApplication(actor, application.applicationId),
        certificate: await findCertificate(actor, application.applicationId),
      }
    } catch (err) {
      const collision = err instanceof AppError && err.code === 'VERIFICATION_CODE_TAKEN'
      if (!collision || attempt === MAX_CODE_ATTEMPTS) throw err
    }
  }
}

export async function getCertificate(actor, applicationId) {
  const application = await requireApplication(actor, applicationId)
  const certificate = await findCertificate(actor, application.applicationId)
  if (!certificate) throw new AppError('CERTIFICATE_NOT_FOUND', 404)
  return certificate
}

export async function renderCertificatePdf(certificate, signature = null) {
  const buffer = await buildCertificatePdf({
    certificate,
    signature,
    verifyUrl: `${VERIFY_BASE}/${certificate.verificationCode}`,
  })

  const subject = (certificate.snapshot?.subjectName ?? 'certificate')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .slice(0, 40)
  return { buffer, fileName: `${subject}-${certificate.verificationCode}.pdf` }
}

export async function getCertificatePdf(actor, applicationId) {
  const certificate = await getCertificate(actor, applicationId)
  const signature = await findCertificateSignature(actor, certificate.certificateId)
  return renderCertificatePdf(certificate, signature)
}


export async function attachIdFile(actor, applicationId, { fileName, buffer, typeAccepted = true }) {
  if (!typeAccepted) throw new AppError('INVALID_FILE_TYPE', 400)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new AppError('MISSING_FILE', 400)
  if (buffer.length > MAX_ATTACHMENT_BYTES) throw new AppError('FILE_TOO_LARGE', 413)

  const contentType = sniffContentType(buffer)
  if (!contentType || !ATTACHMENT_TYPES.includes(contentType)) {
    throw new AppError('INVALID_FILE_TYPE', 400)
  }

  const application = await requireApplication(actor, applicationId)
  const allowed = actor.role === 'manager' ? OPEN_STATUSES : ['pending']
  if (!allowed.includes(application.status)) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  const changed = await updateIdFile(actor, {
    applicationId: application.applicationId,
    fileName: sanitizeFileName(fileName, contentType),
    contentType,
    content: buffer,
  })
  if (changed === 0) throw new AppError('APPLICATION_NOT_EDITABLE', 409)

  return findApplication(actor, application.applicationId)
}

/* ID_FILE_NOT_FOUND is the one new error code these changes introduce. After a release
   it is the normal answer for every approved request, because the bytes are purged in
   the same statement that approves it. */
export async function getIdFile(actor, applicationId) {
  const file = await findIdFile(actor, requireId(applicationId, 'INVALID_APPLICATION_ID'))
  if (!file) throw new AppError('ID_FILE_NOT_FOUND', 404)

  return file
}
