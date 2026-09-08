import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import health from './routes/health.js'
import auth from './modules/auth/auth.router.js'
import admin from './modules/admin/admin.router.js'
import users from './modules/users/users.router.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
const app = express()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/health', health)
app.use('/api/auth',auth)
app.use('/api/admin', admin)
app.use('/api/users', users)


app.use(notFound)
app.use(errorHandler)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`api listening on ${port}`))