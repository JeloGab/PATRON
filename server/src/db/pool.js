import 'dotenv/config'
import pg from 'pg'
const DATE_OID = 1082

pg.types.setTypeParser(DATE_OID, (value) => value)

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('[pg] idle client error:', err.message)
})