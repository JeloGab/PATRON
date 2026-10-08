import { withActor } from '../../db/withTenant.js'
import { AppError } from '../../lib/appError.js'
import { pool } from '../../db/pool.js'

const COLUMNS = `announcement_id, parish_id, title, content, status, status_reason,
                 facebook_post_id, sync_status, created_by, created_at,
                 approved_by, approved_at`

const LIST_COLUMNS = `a.announcement_id, a.parish_id, a.title, a.content, a.status,
                      a.status_reason, a.facebook_post_id, a.sync_status,
                      a.created_by, a.created_at, a.approved_by, a.approved_at,
                      (select count(*) from public.announcement_image i
                        where i.announcement_id = a.announcement_id)::int as image_count`

const IMAGE_COLUMNS = `image_id, announcement_id, slot_no, file_name, content_type,
                       byte_size, uploaded_by, uploaded_at`

const FEED_COLUMNS = `announcement_id, title, content, published_on,
                      parish_id, parish_name, image_count::int as image_count`

const SLOTS = [1, 2, 3, 4]
const EDITABLE = [
  ['title', 'title'],
  ['content', 'content'],
]

function mapAnnouncement(row) {
  return {
    announcementId: row.announcement_id,
    parishId: row.parish_id,
    title: row.title,
    content: row.content,
    status: row.status,
    statusReason: row.status_reason,
    facebookPostId: row.facebook_post_id,
    syncStatus: row.sync_status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    imageCount: row.image_count ?? 0,
  }
}
function mapImage(row) {
  return {
    imageId: row.image_id,
    announcementId: row.announcement_id,
    slotNo: row.slot_no,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  }
}

function mapFeedItem(row) {
  return {
    announcementId: row.announcement_id,
    title: row.title,
    content: row.content,
    publishedOn: row.published_on,
    parishId: row.parish_id,
    parishName: row.parish_name,
    imageCount: row.image_count,
  }
}

export async function insertAnnouncement(actor, { title, content, status, approvedBy }) {
  return withActor(actor, async (client) => {
    try {
      const { rows } = await client.query(
        `insert into public.announcement
           (parish_id, title, content, status, created_by, approved_by, approved_at)
         values ($1, $2, $3, $4, $5, $6,
                 case when $6::uuid is null then null else now() end)
         returning ${COLUMNS}`,
        [actor.parishId, title, content, status, actor.userId, approvedBy]
      )
      return mapAnnouncement(rows[0])
    } catch (err) {
      if (err.code === '42501') throw new AppError('FORBIDDEN', 403)
      throw err
    }
  })
}

export async function findAnnouncements(actor, { status }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${LIST_COLUMNS}
         from public.announcement a
        where ($1::text is null or a.status = $1)
        order by a.created_at desc`,
      [status]
    )
    return rows.map(mapAnnouncement)
  })
}

export async function findAnnouncement(actor, announcementId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${LIST_COLUMNS}
         from public.announcement a
        where a.announcement_id = $1`,
      [announcementId]
    )
    if (rows.length === 0) return null
    return mapAnnouncement(rows[0])
  })
}

export async function updateAnnouncement(actor, announcementId, patch) {
  const present = EDITABLE.filter(([jsKey]) => Object.hasOwn(patch, jsKey))

  return withActor(actor, async (client) => {
    const assignments = present.map(([, column], i) => `${column} = $${i + 2}`)
    const values = present.map(([jsKey]) => patch[jsKey])

    assignments.push(`status = 'pending'`, 'status_reason = null')

    const { rowCount } = await client.query(
      `update public.announcement
          set ${assignments.join(', ')}
        where announcement_id = $1
          and status in ('pending', 'rejected')`,
      [announcementId, ...values]
    )
    return rowCount > 0
  })
}

export async function decideAnnouncement(actor, announcementId, { status, reason }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.announcement
          set status = $2,
              status_reason = $3,
              approved_by = case when $2 = 'approved' then $4::uuid else approved_by end,
              approved_at = case when $2 = 'approved' then now() else approved_at end
        where announcement_id = $1 and status = 'pending'`,
      [announcementId, status, reason, actor.userId]
    )
    return rowCount > 0
  })
}

export async function markArchived(actor, announcementId, { fromStatuses }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `update public.announcement
          set status = 'archived',
              status_reason = null
        where announcement_id = $1
          and status = any($2::text[])`,
      [announcementId, fromStatuses]
    )
    return rowCount > 0
  })
}

async function insertImageOnce(actor, { announcementId, fileName, contentType, content }) {
  return withActor(actor, async (client) => {
    const { rows: used } = await client.query(
      `select slot_no from public.announcement_image where announcement_id = $1`,
      [announcementId]
    )
    const taken = new Set(used.map((row) => row.slot_no))
    const slot = SLOTS.find((number) => !taken.has(number))
    if (!slot) throw new AppError('IMAGE_LIMIT_REACHED', 409)

    try {
      const { rows } = await client.query(
        `insert into public.announcement_image
           (announcement_id, parish_id, file_name, content_type, byte_size,
            content, slot_no, uploaded_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning ${IMAGE_COLUMNS}`,
        [announcementId, actor.parishId, fileName, contentType,
         content.length, content, slot, actor.userId]
      )
      return mapImage(rows[0])
    } catch (err) {
      if (err.code === '42501') throw new AppError('ANNOUNCEMENT_LOCKED', 409)
      throw err
    }
  })
}

export async function insertImage(actor, payload) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await insertImageOnce(actor, payload)
    } catch (err) {
      if (err.code === '23505' && attempt < 4) continue
      throw err
    }
  }
}

export async function findImages(actor, announcementId) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select ${IMAGE_COLUMNS}
         from public.announcement_image
        where announcement_id = $1
        order by slot_no`,
      [announcementId]
    )
    return rows.map(mapImage)
  })
}

export async function findImage(actor, { announcementId, imageId }) {
  return withActor(actor, async (client) => {
    const { rows } = await client.query(
      `select file_name, content_type, content
         from public.announcement_image
        where image_id = $1 and announcement_id = $2`,
      [imageId, announcementId]
    )
    if (rows.length === 0) return null
    return {
      fileName: rows[0].file_name,
      contentType: rows[0].content_type,
      content: rows[0].content,
    }
  })
}

export async function deleteImage(actor, { announcementId, imageId }) {
  return withActor(actor, async (client) => {
    const { rowCount } = await client.query(
      `delete from public.announcement_image
        where image_id = $1 and announcement_id = $2`,
      [imageId, announcementId]
    )
    return rowCount > 0
  })
}

// ── public: no actor, no token, straight at the views ────────────────────

export async function listFeed({ parishId, limit, offset }) {
  const { rows } = await pool.query(
    `select ${FEED_COLUMNS}
       from public.announcement_feed
      where ($1::uuid is null or parish_id = $1)
      order by published_on desc
      limit $2 offset $3`,
    [parishId, limit + 1, offset]
  )
  return {
    announcements: rows.slice(0, limit).map(mapFeedItem),
    hasMore: rows.length > limit,
  }
}

export async function findFeedImage({ announcementId, slotNo }) {
  const { rows } = await pool.query(
    `select content_type, content
       from public.announcement_image_public
      where announcement_id = $1 and slot_no = $2`,
    [announcementId, slotNo]
  )
  if (rows.length === 0) return null
  return { contentType: rows[0].content_type, content: rows[0].content }
}