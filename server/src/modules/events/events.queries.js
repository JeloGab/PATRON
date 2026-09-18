import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const COLUMNS = `e.event_id, e.title, e.description, e.event_type, e.sacrament_type,
                 e.event_date, e.start_time, e.end_time, e.assigned_priest_id,
                 e.status, e.status_reason, e.created_by, e.created_at,
                 e.approved_by, e.approved_at, e.updated_by, e.updated_at,
                 priest.full_name as assigned_priest_name,
                 priest.status as assigned_priest_status`

const SOURCE = `from public.parish_event e
                left join public.app_user priest on priest.user_id = e.assigned_priest_id`

const EDITABLE = [
  ['title', 'title'],
  ['description', 'description'],
  ['eventDate', 'event_date'],
  ['startTime', 'start_time'],
  ['endTime', 'end_time'],
  ['assignedPriestId', 'assigned_priest_id'],
]

function mapEvent(row) {
  return {
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    sacramentType: row.sacrament_type,
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    assignedPriestId: row.assigned_priest_id,
    assignedPriestName: row.assigned_priest_name,
    priestNeedsReassignment: row.assigned_priest_id !== null && row.assigned_priest_status !== 'active',
    status: row.status,
    statusReason: row.status_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  }
}

export async function findEvent(actor, eventId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(`select ${COLUMNS} ${SOURCE} where e.event_id = $1`, [eventId])
    if (rows.length === 0) return null
    return mapEvent(rows[0])
  })
}

export async function findEvents(actor, { from, to }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE}
        where e.event_date between $1 and $2
        order by e.event_date, e.start_time, e.title`,
      [from, to]
    )
    return rows.map(mapEvent)
  })
}

export async function insertEvent(actor, event) {
  return withActor(actor, async (client) => {
    try {
      const { rows } = await client.query(
        `insert into public.parish_event
           (parish_id, title, description, event_type, sacrament_type,
            event_date, start_time, end_time, assigned_priest_id,
            status, created_by, approved_by, approved_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 case when $12::uuid is null then null else now() end)
         returning event_id`,
        [
          actor.parishId,
          event.title,
          event.description,
          event.eventType,
          event.sacramentType,
          event.eventDate,
          event.startTime,
          event.endTime,
          event.assignedPriestId,
          event.status,
          actor.userId,
          event.approvedBy,
        ]
      )
      return rows[0].event_id
    } catch (err) {
      if (err.code === '42501') throw new AppError('FORBIDDEN', 403)
      throw err
    }
  })
}

export async function updateEvent(actor, eventId, { patch, resetApproval }) {
  const present = EDITABLE.filter(([jsKey]) => Object.hasOwn(patch, jsKey))

  return withActor(actor, async (client) => {
    const assignments = present.map(([, column], i) => `${column} = $${i + 2}`)
    const values = present.map(([jsKey]) => patch[jsKey])

    assignments.push(`updated_by = $${values.length + 2}`, 'updated_at = now()')
    values.push(actor.userId)

    if (resetApproval) {
      assignments.push(`status = 'pending'`, 'approved_by = null', 'approved_at = null')
    }

    const { rowCount } = await client.query(
      `update public.parish_event
          set ${assignments.join(', ')}
        where event_id = $1`,
      [eventId, ...values]
    )
    return rowCount > 0
  })
}

export async function decideEvent(actor, eventId, { status, reason }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish_event
          set status = $2,
              status_reason = $3,
              approved_by = case when $2 = 'approved' then $4::uuid else approved_by end,
              approved_at = case when $2 = 'approved' then now() else approved_at end
        where event_id = $1 and status = 'pending'`,
      [eventId, status, reason, actor.userId]
    )
    return rowCount > 0
  })
}

export async function closeEvent(actor, eventId, { status, reason, fromStatuses }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish_event
          set status = $2, status_reason = $3
        where event_id = $1 and status = any($4)`,
      [eventId, status, reason, fromStatuses]
    )
    return rowCount > 0
  })
}

export async function findBlockConflict(actor, { eventDate, startTime, endTime, priestId }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select type
         from public.blocked_date
        where date = $1
          and (start_time is null or (start_time <= $3 and $2 <= end_time))
          and (type = 'parish' or priest_id = $4)
        order by case when type = 'parish' then 0 else 1 end
        limit 1`,
      [eventDate, startTime, endTime, priestId]
    )
    if (rows.length === 0) return null
    return rows[0].type
  })
}

export async function findScheduleConflict(actor, { eventDate, startTime, endTime, priestId, excludeEventId }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE}
        where e.assigned_priest_id = $1
          and e.event_date = $2
          and e.status in ('approved', 'completed')
          and e.start_time <= $4
          and $3 <= e.end_time
          and ($5::uuid is null or e.event_id <> $5)
        limit 1`,
      [priestId, eventDate, startTime, endTime, excludeEventId]
    )
    if (rows.length === 0) return null
    return mapEvent(rows[0])
  })
}

export async function findEventsOnDates(actor, { dates, priestId }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS} ${SOURCE}
        where e.event_date = any($1)
          and e.status in ('pending', 'approved', 'completed')
          and ($2::uuid is null or e.assigned_priest_id = $2)
        order by e.event_date, e.start_time`,
      [dates, priestId]
    )
    return rows.map(mapEvent)
  })
}