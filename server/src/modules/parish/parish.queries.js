import { pool } from '../../db/pool.js'
import { withActor } from '../../db/withTenant.js'

const COLUMNS = `parish_id, name, address, contact_no, email,
                 facebook_page_id, status, created_at`

const DIRECTORY_COLUMNS = `parish_id, name, address, contact_no, email`

const EDITABLE = [
  ['name', 'name'],
  ['address', 'address'],
  ['contactNo', 'contact_no'],
  ['email', 'email'],
  ['facebookPageId', 'facebook_page_id'],
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
  }
}

function mapDirectoryEntry(row) {
  return {
    parishId: row.parish_id,
    name: row.name,
    address: row.address,
    contactNo: row.contact_no,
    email: row.email,
  }
}

function mapPriest(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
  }
}

export async function findOwnParish(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(`select ${COLUMNS} from public.parish`)
    if (rows.length === 0) return null
    return mapParish(rows[0])
  })
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
      `select user_id, full_name
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