import 'dotenv/config'
import pg from 'pg'

export const adminPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_ADMIN,
  ssl: { rejectUnauthorized: false },
  max: 4,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

adminPool.on('error', (err) => {
  console.error('[pg.admin]Unexpected error on idle client', err.message)
})