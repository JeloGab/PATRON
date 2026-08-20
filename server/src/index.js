import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import health from './routes/health.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/health', health)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ ok: false, message: 'internal error' })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`api listening on ${port}`))