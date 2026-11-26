import { pool } from '../../db/pool.js'
import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'

const PAGE_TAKEN = 'parish_facebook_page_unique'

function rethrow(err) {
  if (err.code === '23505' && err.constraint === PAGE_TAKEN) {
    throw new AppError('FACEBOOK_PAGE_TAKEN', 409)
  }
  throw err
}

const COLUMNS = `parish_id, name, address, contact_no, email,
                 facebook_page_id, status, created_at, photo_content_type,
                 office_hours, mass_schedule,
                 patron_saint, feast_day, year_established, history,
                 seal_content_type,
                 public.current_parish_has_page_token() as has_facebook_token`

const DIRECTORY_COLUMNS = `parish_id, name, address, contact_no, email,
                           office_hours, mass_schedule,
                           patron_saint, feast_day, year_established, history`

const EDITABLE = [
  ['name', 'name'],
  ['address', 'address'],
  ['contactNo', 'contact_no'],
  ['email', 'email'],
  ['facebookPageId', 'facebook_page_id'],
  ['officeHours', 'office_hours'],
  ['massSchedule', 'mass_schedule'],
  ['patronSaint', 'patron_saint'],
  ['feastDay', 'feast_day'],
  ['yearEstablished', 'year_established'],
  ['history', 'history'],
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
    patronSaint: row.patron_saint,
    feastDay: row.feast_day,
    yearEstablished: row.year_established,
    history: row.history,
    hasSeal: row.seal_content_type !== null && row.seal_content_type !== undefined,
    hasFacebookToken: row.has_facebook_token === true,
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
    patronSaint: row.patron_saint,
    feastDay: row.feast_day,
    yearEstablished: row.year_established,
    history: row.history,
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

export async function setParishPageToken(actor, token) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set facebook_page_token = $1
        where parish_id = public.current_parish_id()`,
      [token]
    )
    return rowCount
  })
}

export async function clearParishPageToken(actor) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set facebook_page_token = null
        where parish_id = public.current_parish_id()`
    )
    return rowCount
  })
}

export async function clearParishPageTokenIfPageChanged(actor, nextPageId) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set facebook_page_token = null
        where parish_id = public.current_parish_id()
          and facebook_page_id is distinct from $1`,
      [nextPageId]
    )
    return rowCount
  })
}

export async function setParishPageConnection(actor, { pageId, token }) {
  return withActor(actor, async (client) => {
    try {
      const { rowCount } = await client.query(
        `update public.parish
            set facebook_page_id = $1,
                facebook_page_token = $2
          where parish_id = public.current_parish_id()`,
        [pageId, token]
      )
      return rowCount
    } catch (err) {
      return rethrow(err)
    }
  })
}

export async function findOwnPageToken(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query('select public.current_parish_page_token() as token')
    return rows[0]?.token ?? null
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
    try {
      const { rows } = await client.query(
        `update public.parish
            set ${assignments.join(', ')}
          returning ${COLUMNS}`,
        values
      )
      if (rows.length === 0) return null
      return mapParish(rows[0])
    } catch (err) {
      return rethrow(err)
    }
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

export async function setParishSeal(actor, { contentType, content }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set seal = $1,
              seal_content_type = $2
        where parish_id = public.current_parish_id()`,
      [content, contentType]
    )
    return rowCount
  })
}

export async function clearParishSeal(actor) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.parish
          set seal = null,
              seal_content_type = null
        where parish_id = public.current_parish_id()`
    )
    return rowCount
  })
}

export async function findPublicParishSeal(parishId) {
  const { rows } = await pool.query(
    `select seal_content_type, seal
       from public.parish_seal_public
      where parish_id = $1`,
    [parishId]
  )
  if (rows.length === 0) return null
  return { contentType: rows[0].seal_content_type, content: rows[0].seal }
}

function mapGalleryImage(row) {
  return {
    imageId: row.image_id,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    uploadedAt: row.uploaded_at,
  }
}

const GALLERY_LIST = `select image_id, file_name, content_type, byte_size, uploaded_at
                        from public.parish_gallery_image
                       order by uploaded_at, image_id`

export async function listGalleryImages(actor) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(GALLERY_LIST)
    return rows.map(mapGalleryImage)
  })
}

export async function insertGalleryImage(actor, { fileName, contentType, content, max }) {
  return withActor(actor, async (client) => {
    const counted = await client.query(
      `select count(*)::int as total from public.parish_gallery_image`
    )
    if (counted.rows[0].total >= max) return { full: true, images: null }

    await client.query(
      `insert into public.parish_gallery_image
         (parish_id, file_name, content_type, byte_size, content, uploaded_by)
       values (public.current_parish_id(), $1, $2, $3, $4, public.current_user_id())`,
      [fileName, contentType, content.length, content]
    )

    const { rows } = await client.query(GALLERY_LIST)
    return { full: false, images: rows.map(mapGalleryImage) }
  })
}

export async function deleteGalleryImage(actor, imageId) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `delete from public.parish_gallery_image where image_id = $1`,
      [imageId]
    )
    if (rowCount === 0) return null

    const { rows } = await client.query(GALLERY_LIST)
    return rows.map(mapGalleryImage)
  })
}

export async function listPublicGalleryIds(parishId) {
  const { rows } = await pool.query(
    `select image_id
       from public.parish_gallery_public
      where parish_id = $1
      order by uploaded_at, image_id`,
    [parishId]
  )
  return rows.map((row) => row.image_id)
}

export async function findPublicGalleryImage(parishId, imageId) {
  const { rows } = await pool.query(
    `select content_type, content
       from public.parish_gallery_public
      where parish_id = $1 and image_id = $2`,
    [parishId, imageId]
  )
  if (rows.length === 0) return null
  return { contentType: rows[0].content_type, content: rows[0].content }
}
