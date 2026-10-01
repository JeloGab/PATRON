import { withActor } from '../../db/withTenant.js'

const COLUMNS = `p.participant_id, p.event_id, p.participant_name, p.participant_contact,
                 p.participant_date_of_birth, p.gender, p.sponsor_name, p.status,
                 p.created_at, p.updated_at,
                 creator.full_name as created_by_name,
                 editor.full_name as updated_by_name`

const SOURCE = `from public.event_participant p
                join public.app_user creator on creator.user_id = p.created_by
                left join public.app_user editor on editor.user_id = p.updated_by`

const REQUIREMENT_COLUMNS = `r.requirement_id, r.participant_id, r.status, r.notes,
                             r.verified_at, r.matched_record_id,
                             t.requirement_name, t.description,
                             t.auto_check_record_type, t.validity_period_months,
                             verifier.full_name as verified_by_name,
                             rec.record_type as matched_record_type,
                             rec.book_no as matched_book_no,
                             rec.page_no as matched_page_no,
                             rec.entry_no as matched_entry_no,
                             rec.record_date as matched_record_date,
                             subj.names as matched_subject_names`

const REQUIREMENT_SOURCE = `from public.participant_requirement r
                            join public.requirement_template t on t.template_id = r.template_id
                            left join public.app_user verifier on verifier.user_id = r.verified_by
                            left join public.sacramental_record rec on rec.record_id = r.matched_record_id
                            left join lateral (
                              select string_agg(s.full_name, ' & ' order by s.role) as names
                                from public.record_subject s
                               where s.record_id = r.matched_record_id
                            ) subj on true`

const EDITABLE = [
  ['participantName', 'participant_name'],
  ['participantContact', 'participant_contact'],
  ['participantDateOfBirth', 'participant_date_of_birth'],
  ['gender', 'gender'],
  ['sponsorName', 'sponsor_name'],
]

function mapParticipant(row) {
  return {
    participantId: row.participant_id,
    eventId: row.event_id,
    participantName: row.participant_name,
    participantContact: row.participant_contact,
    participantDateOfBirth: row.participant_date_of_birth,
    gender: row.gender,
    sponsorName: row.sponsor_name,
    status: row.status,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
  }
}

function mapRequirement(row) {
  return {
    requirementId: row.requirement_id,
    participantId: row.participant_id,
    requirementName: row.requirement_name,
    description: row.description,
    autoCheckRecordType: row.auto_check_record_type,
    validityPeriodMonths: row.validity_period_months,
    status: row.status,
    notes: row.notes,
    verifiedAt: row.verified_at,
    verifiedByName: row.verified_by_name,
    matchedRecordId: row.matched_record_id,
    matchedRecordType: row.matched_record_type,
    matchedSubjectNames: row.matched_subject_names,
    matchedBookNo: row.matched_book_no,
    matchedPageNo: row.matched_page_no,
    matchedEntryNo: row.matched_entry_no,
    matchedRecordDate: row.matched_record_date,
  }
}

export async function findParticipant(actor, participantId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE} where p.participant_id = $1`,
      [participantId],
    )
    if (rows.length === 0) return null
    return mapParticipant(rows[0])
  })
}

export async function findParticipants(actor, eventId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE}
        where p.event_id = $1
        order by p.participant_name, p.created_at`,
      [eventId],
    )
    return rows.map(mapParticipant)
  })
}

export async function insertParticipant(actor, participant) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `insert into public.event_participant
         (parish_id, event_id, participant_name, participant_contact,
          participant_date_of_birth, gender, sponsor_name, created_by)
       values (public.current_parish_id(), $1, $2, $3, $4, $5, $6, public.current_user_id())
       returning participant_id`,
      [
        participant.eventId,
        participant.participantName,
        participant.participantContact,
        participant.participantDateOfBirth,
        participant.gender,
        participant.sponsorName,
      ],
    )
    return rows[0].participant_id
  })
}

export async function updateParticipant(actor, participantId, patch) {
  const assignments = []
  const values = [participantId]

  for (const [key, column] of EDITABLE) {
    if (!Object.hasOwn(patch, key)) continue
    values.push(patch[key])
    assignments.push(`${column} = $${values.length}`)
  }
  if (assignments.length === 0) return 0

  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.event_participant
          set ${assignments.join(', ')},
              updated_by = public.current_user_id(),
              updated_at = now()
        where participant_id = $1`,
      values,
    )
    return rowCount
  })
}

export async function setParticipantStatus(actor, participantId, status) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.event_participant
          set status = $2
        where participant_id = $1`,
      [participantId, status],
    )
    return rowCount
  })
}

export async function materialiseRequirements(actor, participantId, sacramentType) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `insert into public.participant_requirement (parish_id, participant_id, template_id)
       select public.current_parish_id(), $1, t.template_id
         from public.requirement_template t
        where t.sacrament_type = $2
          and t.availability = true`,
      [participantId, sacramentType],
    )
    return rowCount
  })
}

export async function findRequirements(actor, participantId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${REQUIREMENT_COLUMNS} ${REQUIREMENT_SOURCE}
        where r.participant_id = $1
        order by t.requirement_name`,
      [participantId],
    )
    return rows.map(mapRequirement)
  })
}

export async function findRequirement(actor, requirementId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${REQUIREMENT_COLUMNS} ${REQUIREMENT_SOURCE} where r.requirement_id = $1`,
      [requirementId],
    )
    if (rows.length === 0) return null
    return mapRequirement(rows[0])
  })
}


export async function updateRequirement(actor, requirementId, { status, matchedRecordId, notes, manual }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.participant_requirement
          set status = $2,
              matched_record_id = $3,
              notes = $4,
              verified_by = case when $5 then public.current_user_id() else null end,
              verified_at = now()
        where requirement_id = $1`,
      [requirementId, status, matchedRecordId, notes, manual],
    )
    return rowCount
  })
}

export async function findMatchingRecordIds(actor, { recordType, normalisedName, dateOfBirth }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select distinct rec.record_id
         from public.sacramental_record rec
         join public.record_subject s
           on s.record_id = rec.record_id and s.parish_id = rec.parish_id
        where rec.record_type = $1
          and lower(regexp_replace(btrim(s.full_name), '\\s+', ' ', 'g')) = $2
          and s.date_of_birth = $3
        limit 2`,
      [recordType, normalisedName, dateOfBirth],
    )
    return rows.map((row) => row.record_id)
  })
}

export async function clearParticipant(actor, participantId, eventDate) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.event_participant p
          set status = 'cleared'
        where p.participant_id = $1
          and p.status = 'pending'
          and not exists (
              select 1
                from public.participant_requirement r
                join public.requirement_template t on t.template_id = r.template_id
               where r.participant_id = p.participant_id
                 and (
                     r.status = 'pending'
                     or (t.validity_period_months is not null
                         and r.verified_at
                             + make_interval(months => t.validity_period_months) < $2)
                 )
          )`,
      [participantId, eventDate],
    )
    return rowCount
  })
}

export async function findUnclearedParticipants(actor, eventId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select p.participant_name,
              count(*) filter (where r.status = 'pending') as pending_count
         from public.event_participant p
         left join public.participant_requirement r on r.participant_id = p.participant_id
        where p.event_id = $1
          and p.status = 'pending'
        group by p.participant_id, p.participant_name
        order by p.participant_name`,
      [eventId],
    )
    return rows.map((row) => ({
      participantName: row.participant_name,
      pendingCount: Number(row.pending_count),
    }))
  })
}