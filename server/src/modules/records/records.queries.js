import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const SUBJECT_COLUMNS = `recordsubject_id, role, full_name, date_of_birth, place_of_birth,
                         gender, father_name, mother_name, sponsor_names`

const ATTACHMENT_COLUMNS = `attachment_id, file_name, content_type, byte_size,
                            uploaded_by, uploaded_at`

const RECORD_EDITABLE = [
  ['bookNo', 'book_no'],
  ['pageNo', 'page_no'],
  ['entryNo', 'entry_no'],
  ['recordDate', 'record_date'],
  ['dateOfDeath', 'date_of_death'],
  ['officiantName', 'officiant_name'],
]

const SUBJECT_EDITABLE = [
  ['fullName', 'full_name'],
  ['dateOfBirth', 'date_of_birth'],
  ['placeOfBirth', 'place_of_birth'],
  ['gender', 'gender'],
  ['role', 'role'],
  ['fatherName', 'father_name'],
  ['motherName', 'mother_name'],
  ['sponsorNames', 'sponsor_names'],
]

function mapSubject(row) {
  return {
    subjectId: row.recordsubject_id,
    role: row.role,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    placeOfBirth: row.place_of_birth,
    gender: row.gender,
    fatherName: row.father_name,
    motherName: row.mother_name,
    sponsorNames: row.sponsor_names,
  }
}

function mapRecord(row, subjectRows, attachmentRows) {
  return {
    recordId: row.record_id,
    recordType: row.record_type,
    bookNo: row.book_no,
    pageNo: row.page_no,
    entryNo: row.entry_no,
    recordDate: row.record_date,
    dateOfDeath: row.date_of_death,
    officiantName: row.officiant_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
    subjects: subjectRows.map(mapSubject),
    attachments: attachmentRows.map(mapAttachment),
  }
}

function mapSearchRow(row) {
  return {
    subjectId: row.recordsubject_id,
    fullName: row.full_name,
    role: row.role,
    dateOfBirth: row.date_of_birth,
    recordId: row.record_id,
    recordType: row.record_type,
    recordDate: row.record_date,
    bookNo: row.book_no,
    pageNo: row.page_no,
    entryNo: row.entry_no,
  }
}

function mapWriteError(err) {
  if (err.code === '23505' && err.constraint === 'sacramental_record_registry_key') {
    return new AppError('REGISTRY_ENTRY_TAKEN', 409)
  }
   if (err.code === '23505' && err.constraint === 'record_subject_role_key') {
    return new AppError('INVALID_SUBJECTS', 400)
  }
  if (err.code === '23514' && err.constraint === 'record_subject_role_valid') {
    return new AppError('INVALID_GENDER', 400)
  }
  if (err.code === '42501') return new AppError('FORBIDDEN', 403)
  return err
}

function mapAttachment(row) {
  return {
    attachmentId: row.attachment_id,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  }
}

function buildSet(editable, patch) {
  const present = editable.filter(([jsKey]) => Object.hasOwn(patch, jsKey))
  return {
    assignments: present.map(([, column], i) => `${column} = $${i + 1}`),
    values: present.map(([jsKey]) => patch[jsKey]),
  }
}

const escapeLike = (word) => word.replace(/[\\%_]/g, '\\$&')

async function selectRecord(client, recordId) {
  const { rows } = await client.query(
    `select r.record_id, r.record_type, r.book_no, r.page_no, r.entry_no,
            r.record_date, r.date_of_death, r.officiant_name,
            r.created_by, c.full_name as created_by_name, r.created_at,
            r.updated_by, u.full_name as updated_by_name, r.updated_at
       from public.sacramental_record r
       left join public.app_user c on c.user_id = r.created_by
       left join public.app_user u on u.user_id = r.updated_by
      where r.record_id = $1`,
    [recordId]
  )
  if (rows.length === 0) return null

  const { rows: subjects } = await client.query(
    `select ${SUBJECT_COLUMNS}
       from public.record_subject
      where record_id = $1
      order by full_name`,
    [recordId]
  )
  const { rows: attachments } = await client.query(
    `select ${ATTACHMENT_COLUMNS}
       from public.record_attachment
      where record_id = $1
      order by uploaded_at`,
    [recordId]
  )
  return mapRecord(rows[0], subjects, attachments)
}

export async function findRecord(actor, recordId) {
  return withActor(actor, (client) => selectRecord(client, recordId))
}

export async function insertRecord(actor, record, subjects) {
  return withActor(actor, async (client) => {
    try {
      const { rows } = await client.query(
        `insert into public.sacramental_record
           (parish_id, record_type, book_no, page_no, entry_no,
            record_date, date_of_death, officiant_name, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning record_id`,
        [
          actor.parishId, record.recordType, record.bookNo, record.pageNo, record.entryNo,
          record.recordDate, record.dateOfDeath, record.officiantName, actor.userId,
        ]
      )
      const recordId = rows[0].record_id

      for (const s of subjects) {
        await client.query(
          `insert into public.record_subject
             (record_id, parish_id, role, full_name, date_of_birth, place_of_birth,
              gender, father_name, mother_name, sponsor_names)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            recordId, actor.parishId, s.role, s.fullName, s.dateOfBirth, s.placeOfBirth,
            s.gender, s.fatherName, s.motherName, s.sponsorNames,
          ]
        )
      }

      return selectRecord(client, recordId)
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function updateRecord(actor, recordId, patch) {
  const { assignments, values } = buildSet(RECORD_EDITABLE, patch)
  if (assignments.length === 0) return null
  const n = values.length

  return withActor(actor, async (client) => {
    try {
      const { rowCount } = await client.query(
        `update public.sacramental_record
            set ${assignments.join(', ')},
                updated_by = $${n + 1},
                updated_at = now()
          where record_id = $${n + 2}`,
        [...values, actor.userId, recordId]
      )
      if (rowCount === 0) return null
      return selectRecord(client, recordId)
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function updateSubject(actor, { recordId, subjectId, patch }) {
  const { assignments, values } = buildSet(SUBJECT_EDITABLE, patch)
  if (assignments.length === 0) return null
  const n = values.length

  return withActor(actor, async (client) => {
    try {
      const { rowCount } = await client.query(
        `update public.record_subject
            set ${assignments.join(', ')}
          where recordsubject_id = $${n + 1} and record_id = $${n + 2}`,
        [...values, subjectId, recordId]
      )
      if (rowCount === 0) return null

      await client.query(
        `update public.sacramental_record
            set updated_by = $1, updated_at = now()
          where record_id = $2`,
        [actor.userId, recordId]
      )
      return selectRecord(client, recordId)
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function searchSubjects(actor, { words, recordType, limit, offset }) {
  const conditions = []
  const values = []

  for (const word of words) {
    values.push(`%${escapeLike(word)}%`)
    conditions.push(`s.full_name ilike $${values.length}`)
  }
  if (recordType) {
    values.push(recordType)
    conditions.push(`r.record_type = $${values.length}`)
  }
  values.push(limit, offset)

  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''

  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select s.recordsubject_id, s.full_name, s.role, s.date_of_birth,
              r.record_id, r.record_type, r.record_date, r.book_no, r.page_no, r.entry_no
         from public.record_subject s
         join public.sacramental_record r on r.record_id = s.record_id
         ${where}
        order by s.full_name, r.record_date, s.recordsubject_id
        limit $${values.length - 1} offset $${values.length}`,
      values
    )
    return rows.map(mapSearchRow)
  })
}

export async function insertAttachment(actor, { recordId, fileName, contentType, content }) {
  return withActor(actor, async (client) => {
    try {
      await client.query(
        `insert into public.record_attachment
           (record_id, parish_id, file_name, content_type, byte_size, content, uploaded_by)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [recordId, actor.parishId, fileName, contentType, content.length, content, actor.userId]
      )
      return selectRecord(client, recordId)
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}

export async function findAttachment(actor, { recordId, attachmentId }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select file_name, content_type, content
         from public.record_attachment
        where attachment_id = $1 and record_id = $2`,
      [attachmentId, recordId]
    )
    if (rows.length === 0) return null
    return {
      fileName: rows[0].file_name,
      contentType: rows[0].content_type,
      content: rows[0].content,
    }
  })
}

export async function deleteAttachment(actor, { recordId, attachmentId }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `delete from public.record_attachment
        where attachment_id = $1 and record_id = $2`,
      [attachmentId, recordId]
    )
    if (rowCount === 0) return null
    return selectRecord(client, recordId)
  })
}