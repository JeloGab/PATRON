import { Router } from 'express'
import { pool } from '../db/pool.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      select
        now()                                        as db_time,
        current_user                                 as connected_as,
        (select count(*) from pg_extension
          where extname = 'pg_trgm')                 as trgm,
        (select checked_at from public.health_check
          where id = 1)                              as marker
    `)

    const row = rows[0]
    res.json({
      ok: true,
      db_time: row.db_time,
      connected_as: row.connected_as,
      trgm_installed: Number(row.trgm) === 1,
      marker: row.marker,
    })
  } catch (err) {
    res.status(500).json({
      ok: false,
      stage: 'db_query',
      code: err.code,
      message: err.message,
    })
  }
})

export default router