import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const COLUMNS = `user_id, full_name, username, role, status, parish_id,
                 must_change_password, created_at, deactivated_at`

function mapUser(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    status: row.status,
    parishId: row.parish_id,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at ?? null,
    hasPhoto: row.has_photo ?? null,
  }
}

export async function setOwnSignature(actor, { contentType, content }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.app_user
          set signature = $1,
              signature_content_type = $2
        where user_id = public.current_user_id()`,
      [content, contentType]
    )
    return rowCount
  })
}

export async function clearOwnSignature(actor) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.app_user
          set signature = null,
              signature_content_type = null
        where user_id = public.current_user_id()`
    )
    return rowCount
  })
}

export async function findOwnSignature(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select signature_content_type, signature
         from public.app_user
        where user_id = public.current_user_id()`
    )
    if (rows.length === 0 || rows[0].signature === null) return null
    return { contentType: rows[0].signature_content_type, content: rows[0].signature }
  })
}

export async function insertManager(actor, { fullName, username, passwordHash }) {
  return withActor(actor, async (client) => {
    try {
      const { rows } = await client.query(
        `insert into public.app_user
           (full_name, username, password_hash, role, parish_id, must_change_password)
         values ($1, $2, $3, 'manager', $4, true)
         returning ${COLUMNS}`,
        [fullName, username, passwordHash, actor.parishId]
      )
      return mapUser(rows[0])
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'app_user_username_key') {
        throw new AppError('USERNAME_TAKEN', 409)
      }
      if (err.code === '42501') throw new AppError('FORBIDDEN', 403)
      throw err
    }
  })
}

export async function listManagers(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${COLUMNS}, (photo is not null) as has_photo
         from public.app_user
        where role = 'manager'
        order by full_name`
    )
    return rows.map(mapUser)
  })
}

export async function setManagerStatus(actor, { userId, status }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `update public.app_user
          set status = $1,
              deactivated_at = case when $1 = 'inactive' then now() else null end,
              deactivated_by = case when $1 = 'inactive' then $2::uuid else null end
        where user_id = $3 and role = 'manager'
        returning ${COLUMNS}`,
      [status, actor.userId, userId]
    )
    if (rows.length === 0) return null
    return mapUser(rows[0])
  })
}

export async function setManagerPassword(actor, { userId, passwordHash }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `update public.app_user
          set password_hash = $1,
              must_change_password = true,
              password_changed_at = now()
        where user_id = $2 and role = 'manager'
        returning ${COLUMNS}`,
      [passwordHash, userId]
    )
    if (rows.length === 0) return null
    return mapUser(rows[0])
  })
}