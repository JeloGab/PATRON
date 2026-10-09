import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const RECORD_TYPE_FOR = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  funeral: 'death',
}

function mapWriteError(err) {
  if (err.code === '23505' && err.constraint === 'sacramental_record_registry_key') {
    return new AppError('REGISTRY_ENTRY_TAKEN', 409)
  }
  if (err.code === '23505' && err.constraint === 'document_file_verification_code_key') {
    return new AppError('VERIFICATION_CODE_TAKEN', 409)
  }
  if (err.code === '23505' && err.constraint === 'document_file_event_record_key') {
    return new AppError('CERTIFICATE_ALREADY_ISSUED', 409)
  }
  if (err.code === '42501') return new AppError('FORBIDDEN', 403)
  return err
}

async function selectContext(client, { recordType, priestId }) {
  const { rows } = await client.query(
    `select p.name as parish_name, p.address as parish_address,
            p.contact_no as parish_contact,
            t.type_id, t.name as document_name, t.availability,
            priest.full_name as signatory_name, priest.status as signatory_status
       from public.parish p
       join public.document_type t on t.record_type = $1
       join public.app_user priest on priest.user_id = $2
      where p.parish_id = public.current_parish_id()`,
    [recordType, priestId]
  )
  if (rows.length === 0 || !rows[0].availability) {
    throw new AppError('DOCUMENT_TYPE_UNAVAILABLE', 409)
  }
  return rows[0]
}

async function selectRoster(client, eventId) {
  const { rows } = await client.query(
    `select p.participant_id, p.participant_name, p.participant_date_of_birth,
            p.gender, p.sponsor_name, p.status,
            (select count(*)
               from public.participant_requirement r
              where r.participant_id = p.participant_id
                and r.status = 'pending') as pending_count
       from public.event_participant p
      where p.event_id = $1
        and p.status <> 'withdrawn'
      order by p.participant_name, p.created_at`,
    [eventId]
  )
  return rows.map((row) => ({
    participantId: row.participant_id,
    participantName: row.participant_name,
    dateOfBirth: row.participant_date_of_birth,
    gender: row.gender,
    sponsorName: row.sponsor_name,
    status: row.status,
    pendingCount: Number(row.pending_count),
  }))
}

async function lastEntryNumber(client, recordType) {
  const { rows } = await client.query(
    `select coalesce(max(entry_no::bigint), 0) as last
       from public.sacramental_record
      where record_type = $1
        and entry_no ~ '^[0-9]{1,15}$'`,
    [recordType]
  )
  return Number(rows[0].last)
}

export async function completeEventAndIssue(
  actor,
  { eventId, registry, details, planRecords, buildSnapshot, mintCode }
) {
  return withActor(actor, async (client) => {
    try {
      const completed = await client.query(
        `update public.parish_event
            set status = 'completed', status_reason = null
          where event_id = $1
            and status = 'approved'
          returning event_type, sacrament_type, event_date, assigned_priest_id`,
        [eventId]
      )
      if (completed.rowCount === 0) return null

      const event = completed.rows[0]
      const recordType = RECORD_TYPE_FOR[event.sacrament_type]
      if (event.event_type !== 'sacramental' || !recordType) {
        return { records: 0, certificates: 0, warnings: [] }
      }

      const context = await selectContext(client, {
        recordType,
        priestId: event.assigned_priest_id,
      })
      const roster = await selectRoster(client, eventId)

      const { drafts, warnings } = planRecords({
        recordType,
        eventDate: event.event_date,
        officiantName: context.signatory_name,
        registry,
        details,
        roster,
      })

      if (context.signatory_status !== 'active') {
        warnings.push(
          `${context.signatory_name} is no longer active — recorded as officiant and signatory anyway`
        )
      }
      if (drafts.length === 0) return { records: 0, certificates: 0, warnings }

      let entryNo = await lastEntryNumber(client, recordType)

      for (const draft of drafts) {
        entryNo += 1
        const record = { ...draft.record, entryNo: String(entryNo) }

        const { rows } = await client.query(
          `insert into public.sacramental_record
             (parish_id, record_type, book_no, page_no, entry_no, record_date,
              date_of_death, officiant_name, created_by, source_event_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           returning record_id`,
          [
            actor.parishId, recordType, record.bookNo, record.pageNo, record.entryNo,
            record.recordDate, record.dateOfDeath, record.officiantName, actor.userId, eventId,
          ]
        )
        const recordId = rows[0].record_id

        for (const s of draft.subjects) {
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

        const snapshot = buildSnapshot({
          record: {
            record_type: recordType,
            document_name: context.document_name,
            book_no: record.bookNo,
            page_no: record.pageNo,
            entry_no: record.entryNo,
            record_date: record.recordDate,
            date_of_death: record.dateOfDeath,
            officiant_name: record.officiantName,
            parish_name: context.parish_name,
            parish_address: context.parish_address,
            parish_contact: context.parish_contact,
            signatory_name: context.signatory_name,
          },
          subjects: draft.subjects.map((s) => ({
            role: s.role,
            full_name: s.fullName,
            date_of_birth: s.dateOfBirth,
            place_of_birth: s.placeOfBirth,
            gender: s.gender,
            father_name: s.fatherName,
            mother_name: s.motherName,
            sponsor_names: s.sponsorNames,
          })),
          purpose: null,
          releaseType: 'event_completion',
        })

        await client.query(
          `insert into public.document_file
             (parish_id, document_type_id, record_id, source_event_id, release_type,
              verification_code, snapshot, signatory_id, issued_by)
           values ($1, $2, $3, $4, 'event_completion', $5, $6, $7, $8)`,
          [
            actor.parishId, context.type_id, recordId, eventId, mintCode(),
            JSON.stringify(snapshot), event.assigned_priest_id, actor.userId,
          ]
        )
      }

      return { records: drafts.length, certificates: drafts.length, warnings }
    } catch (err) {
      throw mapWriteError(err)
    }
  })
}