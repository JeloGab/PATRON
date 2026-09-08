import { adminPool } from '../../db/adminPool.js'
import { AppError } from '../../lib/appError.js'

function mapParish(row) {
  return {
    parishId: row.parish_id,
    name: row.name,
    address: row.address,
    contactNo: row.contact_no,
    email: row.email,
    facebookPageId: row.facebook_page_id,
    status: row.status,
    createdAt: row.created_at,
  }
}

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
  }
}

export async function insertParish({ name, address, contactNo, email, facebookPageId }) {
  const { rows } = await adminPool.query(
    `insert into public.parish (name, address, contact_no, email, facebook_page_id)
     values ($1, $2, $3, $4, $5)
     returning parish_id, name, address, contact_no, email,
               facebook_page_id, status, created_at`,
    [name, address, contactNo, email, facebookPageId]
  )
  return mapParish(rows[0])
}

export async function listParishes() {
  const { rows } = await adminPool.query(
    `select parish_id, name, address, contact_no, email,
            facebook_page_id, status, created_at
       from public.parish
      order by name`
  )
  return rows.map(mapParish)
}

export async function findParishById(parishId) {
  const { rows } = await adminPool.query(
    'select parish_id, name, status from public.parish where parish_id = $1',
    [parishId]
  )
  if (rows.length === 0) return null

  return {
    parishId: rows[0].parish_id,
    name: rows[0].name,
    status: rows[0].status,
  }
}

export async function insertStaff({ fullName, username, passwordHash, role, parishId }) {
  try {
    const { rows } = await adminPool.query(
      `insert into public.app_user
         (full_name, username, password_hash, role, parish_id, must_change_password)
       values ($1, $2, $3, $4, $5, true)
       returning user_id, full_name, username, role, status, parish_id,
                 must_change_password, created_at, deactivated_at`,
      [fullName, username, passwordHash, role, parishId]
    )
    return mapUser(rows[0])
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'app_user_username_key') {
      throw new AppError('USERNAME_TAKEN', 409)
    }
    if (err.code === '23503') throw new AppError('PARISH_NOT_FOUND', 404)
    throw err
  }
}

export async function listStaffByRole(role, parishId = null) {
  const { rows } = await adminPool.query(
    `select user_id, full_name, username, role, status, parish_id,
            must_change_password, created_at, deactivated_at
       from public.app_user
      where role = $1
        and ($2::uuid is null or parish_id = $2::uuid)
      order by full_name`,
    [role, parishId]
  )
  return rows.map(mapUser)
}

export async function setUserStatus({ userId, role, status, actorId }) {
  const { rows } = await adminPool.query(
    `update public.app_user
        set status = $1,
            deactivated_at = case when $1 = 'inactive' then now() else null end,
            deactivated_by = case when $1 = 'inactive' then $2::uuid else null end
      where user_id = $3 and role = $4
      returning user_id, full_name, username, role, status, parish_id,
                must_change_password, created_at, deactivated_at`,
    [status, actorId, userId, role]
  )
  if (rows.length === 0) return null
  return mapUser(rows[0])
}

export async function setStaffPassword({ userId, role, passwordHash }) {
  const { rows } = await adminPool.query(
    `update public.app_user
        set password_hash = $1,
            must_change_password = true,
            password_changed_at = now()
      where user_id = $2 and role = $3
      returning user_id, full_name, username, role, status, parish_id,
                must_change_password, created_at, deactivated_at`,
    [passwordHash, userId, role]
  )
  if (rows.length === 0) return null
  return mapUser(rows[0])
}