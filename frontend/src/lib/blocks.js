import { seedBlocks } from '../data/mock.js'
import { byDateTime } from './events.js'

const STORAGE_KEY = 'patron.manager.blocks.v1'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return null
  }
  return null
}

export function loadBlocks() {
  const stored = readStored()
  if (!stored) return seedBlocks().sort(byDateTime)
  const seeds = seedBlocks().filter((block) => !stored.some((item) => item.id === block.id))
  return [...stored, ...seeds].sort(byDateTime)
}

export function saveBlocks(blocks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks))
  } catch {
    // The list still updates in memory for this visit.
  }
}

export function createBlockRecord(input) {
  return {
    id: `blk-${Date.now().toString(36)}`,
    date: input.date,
    time: input.time,
    reason: input.reason.trim(),
  }
}
