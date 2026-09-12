import { AppError } from '../../lib/appError.js'
import { isUuid } from '../../lib/credentials.js'
import { clean, requireRecordType, requireRegistryPart, requireOfficiant, requirePastDate, optionalPastDate, requireSubjectName, optionalSubjectName, requireGender, optionalPlaceOfBirth, optionalSponsorNames } from '../../lib/validators.js'
import { findRecord, insertRecord, updateRecord, updateSubject, searchSubjects, } from './records.queries.js'

const PAGE_SIZE = 50
const MAX_SEARCH_WORDS = 5
const NEEDS_BIRTH_DATE = ['baptism', 'confirmation']
const SUBJECT_COUNT = { marriage: 2 }

function requireId(value, code) {
  const id = clean(value).toLowerCase()
  if (!isUuid(id)) throw new AppError(code, 400)
  return id
}

function roleFor(recordType, gender) {
  if (recordType !== 'marriage') return 'primary'
  return gender === 'male' ? 'groom' : 'bride'
}

function cleanNewSubject(input) {
  const subject = input ?? {}
  return {
    fullName: requireSubjectName(subject.fullName),
    dateOfBirth: optionalPastDate(subject.dateOfBirth, 'INVALID_BIRTH_DATE'),
    placeOfBirth: optionalPlaceOfBirth(subject.placeOfBirth),
    gender: requireGender(subject.gender),
    fatherName: optionalSubjectName(subject.fatherName),
    motherName: optionalSubjectName(subject.motherName),
    sponsorNames: optionalSponsorNames(subject.sponsorNames),
  }
}

function checkDates(recordType, { recordDate, dateOfDeath }, subjects) {
  if (dateOfDeath && recordType !== 'death') throw new AppError('INVALID_DEATH_DATE', 400)
  if (dateOfDeath && dateOfDeath > recordDate) throw new AppError('INVALID_DEATH_DATE', 400)

  for (const { dateOfBirth } of subjects) {
    if (!dateOfBirth) {
      if (NEEDS_BIRTH_DATE.includes(recordType)) throw new AppError('INVALID_BIRTH_DATE', 400)
      continue
    }
    if (dateOfBirth > recordDate) throw new AppError('INVALID_BIRTH_DATE', 400)
    if (dateOfDeath && dateOfBirth > dateOfDeath) throw new AppError('INVALID_BIRTH_DATE', 400)
  }
}

export async function createRecord(actor, body) {
  const recordType = requireRecordType(body.recordType)
  const record = {
    recordType,
    bookNo: requireRegistryPart(body.bookNo),
    pageNo: requireRegistryPart(body.pageNo),
    entryNo: requireRegistryPart(body.entryNo),
    recordDate: requirePastDate(body.recordDate, 'INVALID_RECORD_DATE'),
    dateOfDeath: optionalPastDate(body.dateOfDeath, 'INVALID_DEATH_DATE'),
    officiantName: requireOfficiant(body.officiantName),
  }

  const count = SUBJECT_COUNT[recordType] ?? 1
  if (!Array.isArray(body.subjects) || body.subjects.length !== count) {
    throw new AppError('INVALID_SUBJECTS', 400)
  }

  const subjects = body.subjects.map((input) => {
    const subject = cleanNewSubject(input)
    return { ...subject, role: roleFor(recordType, subject.gender) }
  })

  if (recordType === 'marriage' && subjects[0].role === subjects[1].role) {
    throw new AppError('INVALID_SUBJECTS', 400)
  }

  checkDates(recordType, record, subjects)

  return insertRecord(actor, record, subjects)
}

export async function getRecord(actor, recordId) {
  const record = await findRecord(actor, requireId(recordId, 'INVALID_RECORD_ID'))
  if (!record) throw new AppError('RECORD_NOT_FOUND', 404)
  return record
}

export async function searchRecords(actor, { q, type, page } = {}) {
  const words = clean(q).split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_WORDS)
  const recordType = clean(type) ? requireRecordType(type) : null
  const pageNo = Math.max(1, Number.parseInt(page, 10) || 1)

  const rows = await searchSubjects(actor, {
    words,
    recordType,
    limit: PAGE_SIZE + 1,
    offset: (pageNo - 1) * PAGE_SIZE,
  })

  return {
    results: rows.slice(0, PAGE_SIZE),
    page: pageNo,
    hasMore: rows.length > PAGE_SIZE,
  }
}

export async function editRecord(actor, recordId, body) {
  const id = requireId(recordId, 'INVALID_RECORD_ID')

  const patch = {}
  if (body.bookNo !== undefined) patch.bookNo = requireRegistryPart(body.bookNo)
  if (body.pageNo !== undefined) patch.pageNo = requireRegistryPart(body.pageNo)
  if (body.entryNo !== undefined) patch.entryNo = requireRegistryPart(body.entryNo)
  if (body.recordDate !== undefined) patch.recordDate = requirePastDate(body.recordDate, 'INVALID_RECORD_DATE')
  if (body.dateOfDeath !== undefined) patch.dateOfDeath = optionalPastDate(body.dateOfDeath, 'INVALID_DEATH_DATE')
  if (body.officiantName !== undefined) patch.officiantName = requireOfficiant(body.officiantName)

  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const current = await findRecord(actor, id)
  if (!current) throw new AppError('RECORD_NOT_FOUND', 404)

  checkDates(current.recordType, { ...current, ...patch }, current.subjects)

  const record = await updateRecord(actor, id, patch)
  if (!record) throw new AppError('RECORD_NOT_FOUND', 404)
  return record
}

export async function editSubject(actor, { recordId, subjectId }, body) {
  const rid = requireId(recordId, 'INVALID_RECORD_ID')
  const sid = requireId(subjectId, 'INVALID_SUBJECT_ID')

  const patch = {}
  if (body.fullName !== undefined) patch.fullName = requireSubjectName(body.fullName)
  if (body.dateOfBirth !== undefined) patch.dateOfBirth = optionalPastDate(body.dateOfBirth, 'INVALID_BIRTH_DATE')
  if (body.placeOfBirth !== undefined) patch.placeOfBirth = optionalPlaceOfBirth(body.placeOfBirth)
  if (body.gender !== undefined) patch.gender = requireGender(body.gender)
  if (body.fatherName !== undefined) patch.fatherName = optionalSubjectName(body.fatherName)
  if (body.motherName !== undefined) patch.motherName = optionalSubjectName(body.motherName)
  if (body.sponsorNames !== undefined) patch.sponsorNames = optionalSponsorNames(body.sponsorNames)

  if (Object.keys(patch).length === 0) throw new AppError('NO_FIELDS_TO_UPDATE', 400)

  const current = await findRecord(actor, rid)
  if (!current) throw new AppError('RECORD_NOT_FOUND', 404)

  const subject = current.subjects.find((s) => s.subjectId === sid)
  if (!subject) throw new AppError('SUBJECT_NOT_FOUND', 404)
  
    if (patch.gender && patch.gender !== subject.gender) {
    patch.role = roleFor(current.recordType, patch.gender)
    const other = current.subjects.find((s) => s.subjectId !== sid)
    if (other && other.role === patch.role) throw new AppError('INVALID_SUBJECTS', 400)
  }
  checkDates(current.recordType, current, [{ ...subject, ...patch }])

  const record = await updateSubject(actor, { recordId: rid, subjectId: sid, patch })
  if (!record) throw new AppError('SUBJECT_NOT_FOUND', 404)
  return record
}