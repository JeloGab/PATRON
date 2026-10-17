import { pool } from '../../db/pool.js'
import { withActor } from '../../db/withTenant.js'

const COLUMNS = `parish_id, name, address, contact_no, email,
                 facebook_page_id, status, created_at, photo_content_type,
                 office_hours, mass_schedule`

const DIRECTORY_COLUMNS = `parish_id, name, address, contact_no, email,
                           office_hours, mass_schedule`

const EDITABLE = [
  ['name', 'name'],
  ['address', 'address'],
  ['contactNo', 'contact_no'],
  ['email', 'email'],
  ['facebookPageId', 'facebook_page_id'],
  ['officeHours', 'office_hours'],
  ['massSchedule', 'mass_schedule'],
]

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
    hasPhoto: row.photo_content_type !== null && row.photo_content_type !== undefined,
    officeHours: row.office_hours,
    massSchedule: row.mass_schedule,
  }
}

function mapDirectoryEntry(row) {
  return {
    parishId: row.parish_id,
    name: row.name,
    address: row.address,
    contactNo: row.contact_no,
    email: row.email,
    officeHours: row.office_hours,
    massSchedule: row.mass_schedule,
  }
}

function mapPriest(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    hasSignature: row.has_signature,
    hasPhoto: row.has_photo,
  }
}

export async function findOwnParish(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(`select ${COLUMNS} from public.parish`)
    if (rows.length === 0) return null
    return mapParish(rows[0])
  })
}

export async function setParishPhoto(actor, { contentType, content }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set photo = $1,
              photo_content_type = $2
        where parish_id = public.current_parish_id()`,
      [content, contentType]
    )
    return rowCount
  })
}

export async function clearParishPhoto(actor) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set photo = null,
              photo_content_type = null
        where parish_id = public.current_parish_id()`
    )
    return rowCount
  })
}

export async function findPublicParishPhoto(parishId) {
  const { rows } = await pool.query(
    `select photo_content_type, photo
       from public.parish_photo_public
      where parish_id = $1`,
    [parishId]
  )
  if (rows.length === 0) return null
  return { contentType: rows[0].photo_content_type, content: rows[0].photo }
}

export async function updateOwnParish(actor, patch) {
  const present = EDITABLE.filter(([jsKey]) => Object.hasOwn(patch, jsKey))
  if (present.length === 0) return null

  const assignments = present.map(([, column], i) => `${column} = $${i + 1}`)
  const values = present.map(([jsKey]) => patch[jsKey])

  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `update public.parish
          set ${assignments.join(', ')}
        returning ${COLUMNS}`,
      values
    )
    if (rows.length === 0) return null
    return mapParish(rows[0])
  })
}

export async function listParishDirectory() {
  const { rows } = await pool.query(
    `select ${DIRECTORY_COLUMNS}
       from public.parish_directory
      order by name`
  )
  return rows.map(mapDirectoryEntry)
}

export async function findDirectoryEntry(parishId) {
  const { rows } = await pool.query(
    `select ${DIRECTORY_COLUMNS}
       from public.parish_directory
      where parish_id = $1`,
    [parishId]
  )
  if (rows.length === 0) return null
  return mapDirectoryEntry(rows[0])
}

export async function listActivePriests(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select user_id, full_name,
              (signature is not null) as has_signature,
              (photo is not null) as has_photo
         from public.app_user
        where role = 'priest' and status = 'active'
        order by full_name`
    )
    return rows.map(mapPriest)
  })
}

export async function findActivePriest(actor, priestId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select user_id
         from public.app_user
        where user_id = $1 and role = 'priest' and status = 'active'`,
      [priestId]
    )
    if (rows.length === 0) return null
    return rows[0].user_id
  })
}

export async function listPublicClergy(parishId) {
  const { rows } = await pool.query(
    `select user_id, full_name, has_photo
       from public.parish_clergy_public
      where parish_id = $1
      order by full_name`,
    [parishId]
  )
  return rows.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    hasPhoto: row.has_photo,
  }))
}

export async function findPublicClergyPhoto(parishId, userId) {
  const { rows } = await pool.query(
    `select photo_content_type, photo
       from public.parish_clergy_photo_public
      where parish_id = $1 and user_id = $2`,
    [parishId, userId]
  )
  if (rows.length === 0) return null
  return { contentType: rows[0].photo_content_type, content: rows[0].photo }
}
