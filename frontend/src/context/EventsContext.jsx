import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createBlockRecord, loadBlocks, saveBlocks } from '../lib/blocks.js'
import { byDateTime, createEventRecord, loadEvents, saveEvents } from '../lib/events.js'

const EventsContext = createContext(null)

export function EventsProvider({ children }) {
  const [events, setEvents] = useState(() => loadEvents())
  const [blocks, setBlocks] = useState(() => loadBlocks())

  useEffect(() => {
    saveEvents(events)
  }, [events])

  useEffect(() => {
    saveBlocks(blocks)
  }, [blocks])

  const value = useMemo(
    () => ({
      events,
      blocks,
      addEvent(input) {
        const event = createEventRecord(input)
        setEvents((current) => [...current, event].sort(byDateTime))
        return event
      },
      addBlock(input) {
        const block = createBlockRecord(input)
        setBlocks((current) => [...current, block].sort(byDateTime))
        return block
      },
    }),
    [events, blocks],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents() {
  const value = useContext(EventsContext)
  if (!value) throw new Error('useEvents must be used within EventsProvider')
  return value
}
