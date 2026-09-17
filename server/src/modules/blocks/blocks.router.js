import { Router } from 'express'
import { requireAuth, requirePasswordChanged, requireRole } from '../auth/auth.middleware.js'
import { createBlocks, listBlocks, removeBlock } from './blocks.services.js'

const router = Router()

router.use(requireAuth, requirePasswordChanged, requireRole('priest', 'manager'))

router.get('/', async (req, res) => {
  res.json({ ok: true, blocks: await listBlocks(req.user, req.query) })
})

router.post('/', async (req, res) => {
  res.status(201).json({ ok: true, ...(await createBlocks(req.user, req.body ?? {})) })
})

router.delete('/:blockedDateId', async (req, res) => {
  await removeBlock(req.user, req.params.blockedDateId)
  res.json({ ok: true })
})

export default router