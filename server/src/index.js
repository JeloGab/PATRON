import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import health from './routes/health.js'
import auth from './modules/auth/auth.router.js'
import admin from './modules/admin/admin.router.js'
import users from './modules/users/users.router.js'
import parish from './modules/parish/parish.router.js'
import parishPublic from './modules/parish/parish.public.router.js'
import records from './modules/records/records.router.js'
import blocks from './modules/blocks/blocks.router.js'
import events from './modules/events/events.router.js'
import documents from './modules/documents/documents.router.js'
import documentRequests from './modules/documents/documents.requests.router.js'
import documentTypes from './modules/documents/documents.public.router.js'
import participants from './modules/participants/participants.router.js'
import verification from './modules/verification/verification.public.router.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))

app.use(helmet())
app.use(express.json())

app.use('/api/health', health)
app.use('/api/auth',auth)
app.use('/api/admin', admin)
app.use('/api/users', users)
app.use('/api/parish', parish)
app.use('/api/parishes', parishPublic)
app.use('/api/records', records)
app.use('/api/blocked-dates', blocks)
app.use('/api/events', events)
app.use('/api/documents', documents)
app.use('/api/requests', documentRequests)
app.use('/api/document-types', documentTypes)
app.use('/api/verify', verification)
app.use('/api/participants', participants)


app.use(notFound)
app.use(errorHandler)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`api listening on ${port}`))