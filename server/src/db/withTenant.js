import { pool } from './pool.js'

export async function withActor({ parishId = null, userId = null}, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'select set_config($1, $2, true), set_config($3, $4, true)',
      ['app.parish_id', parishId ?? '', 'app.user_id', userId ?? '']
    )
    const result = await fn(client)
    await client.query('commit')
    return result
  }catch (err) {
    await client.query('rollback')
    throw err
}finally {
    client.release()
  }
}