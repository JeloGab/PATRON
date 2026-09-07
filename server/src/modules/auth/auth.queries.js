import {pool} from '../../db/pool.js'
import {withActor} from '../../db/withTenant.js'

export async function findStaffByUsername(username) {
  const { rows } = await pool.query(
    'select * from public.auth_lookup_staff($1)',
    [username]
  )
  if (rows.length === 0) return null

  const row = rows[0]
  return {
    userId: row.user_id,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    parishId: row.parish_id,
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password,
  }
}

export async function findOwnPasswordHash(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      'select password_hash from public.app_user where user_id = $1',
      [actor.userId]
    )
    return rows[0]?.password_hash ?? null
  })
}

export async function setPassword(actor, passwordHash) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.app_user
          set password_hash = $1,
              must_change_password = false,
              password_changed_at = now()
        where user_id = $2`,
      [passwordHash, actor.userId]
    )
    return rowCount
  })
}

export async function findSelf(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select user_id, full_name, username, email, role, status,
              parish_id, must_change_password
         from public.app_user
        where user_id = $1`,
      [actor.userId]
    )
    if (rows.length === 0) return null

    const row = rows[0]
    return {
      userId: row.user_id,
      fullName: row.full_name,
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      parishId: row.parish_id,
      mustChangePassword: row.must_change_password,
    }
  })
}

export async function findParishionerBySupabaseId(supabaseUserId) {
  const { rows } = await pool.query(
    'select * from public.auth_lookup_parishioner($1)',
    [supabaseUserId]
  )
  if (rows.length === 0) return null

  const row = rows[0]
  return {
    userId: row.user_id,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    email: row.email,
  }
}

export async function insertParishioner({ fullName, email, supabaseUserId }) {
  return withActor({}, async (client) => {
    await client.query(
      `insert into public.app_user (full_name, email, supabase_user_id, role)
       values ($1, $2, $3, 'parishioner')`,
      [fullName, email, supabaseUserId]
    )
  })
}

export async function checkSession(userId) {
  const { rows } = await pool.query(
    'select * from public.auth_session_check($1)',
    [userId]
  )
  if (rows.length === 0) return null

  const row = rows[0]
  return {
    status: row.status,
    role: row.role,
    parishId: row.parish_id,
    mustChangePassword: row.must_change_password,
    passwordChangedAt: row.password_changed_at,
  }
}