import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PRIEST, seedApprovals, seedBlocks, seedEvents } from '../data/priestMock.js'
import { byDateTime } from '../lib/events.js'

const UNAVAILABLE_KEY = 'patron.priest.unavailable.v1'
const APPROVALS_KEY = 'patron.priest.approvals.v2'
const ParishContext = createContext(null)

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return null
  }
  return null
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // The list still updates in memory for this visit.
  }
}

export function ParishProvider({ children }) {
  const events = useMemo(
    () => seedEvents().filter((event) => event.priest === PRIEST.name).sort(byDateTime),
    [],
  )
  const churchBlocks = useMemo(() => seedBlocks().sort(byDateTime), [])
  const [unavailable, setUnavailable] = useState(() => readList(UNAVAILABLE_KEY) || [])
  const [approvals, setApprovals] = useState(() => {
    const stored = readList(APPROVALS_KEY)
    if (!stored) return seedApprovals().sort(byDateTime)
    const seeds = seedApprovals().filter((item) => !stored.some((row) => row.id === item.id))
    return [...stored, ...seeds].sort(byDateTime)
  })

  useEffect(() => {
    writeList(UNAVAILABLE_KEY, unavailable)
  }, [unavailable])

  useEffect(() => {
    writeList(APPROVALS_KEY, approvals)
  }, [approvals])

  const value = useMemo(
    () => ({
      priest: PRIEST,
      events,
      churchBlocks,
      unavailable,
      approvals,
      pendingCount: approvals.filter((item) => item.status === 'For approval').length,
      addUnavailable(input) {
        const entry = {
          id: `unav-${Date.now().toString(36)}`,
          date: input.date,
          time: input.time,
          reason: input.reason.trim(),
        }
        setUnavailable((current) => [...current, entry].sort(byDateTime))
        return entry
      },
      decideApproval(id, status) {
        setApprovals((current) =>
          current.map((item) => (item.id === id ? { ...item, status } : item)),
        )
      },
    }),
    [events, churchBlocks, unavailable, approvals],
  )

  return <ParishContext.Provider value={value}>{children}</ParishContext.Provider>
}

export function useParish() {
  const value = useContext(ParishContext)
  if (!value) throw new Error('useParish must be used within ParishProvider')
  return value
}
