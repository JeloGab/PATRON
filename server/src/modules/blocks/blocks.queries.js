import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const COLUMNS = `blocked_date_id, type, priest_id, date, start_time, end_time,
                 reason, blocked_by, created_at`

function mapBlock(row) {
  return {
    blockedDateId: row.blocked_date_id,
    type: row.type,
    priestId: row.priest_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
    blockedBy: row.blocked_by,
    createdAt: row.created_at,
  }
}

export async function insertBlocks(actor, { type, priestId, dates, startTime, endTime, reason }) {
  return withActor(actor, async (client) => {
    const blocks = []
    for (const date of dates) {
      try {
        const { rows } = await client.query(
          `insert into public.blocked_date
             (parish_id, type, priest_id, date, start_time, end_time, reason, blocked_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning ${COLUMNS}`,
          [actor.parishId, type, priestId, date, startTime, endTime, reason, actor.userId]
        )
        blocks.push(mapBlock(rows[0]))
      } catch (err) {
        if (err.code === '42501') throw new AppError('FORBIDDEN', 403)
        throw err
      }
    }
    return blocks
  })
}

export async function findBlocks(actor, { from, to }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS}
         from public.blocked_date
        where date between $1 and $2
        order by date, start_time nulls first`,
      [from, to]
    )
    return rows.map(mapBlock)
  })
}

export async function deleteBlock(actor, blockedDateId) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `delete from public.blocked_date where blocked_date_id = $1`,
      [blockedDateId]
    )
    return rowCount > 0
  })
}