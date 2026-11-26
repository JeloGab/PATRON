// Blocked dates: 'parish' closes the day for all, 'priest' for one. Saving warns.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConfirm } from './ConfirmProvider.jsx'
import DatePickerModal from './DatePickerModal.jsx'
import Skeleton from './Skeleton.jsx'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate, formatWeekdayDate, isoOffset, todayISO } from '../lib/dates.js'
import { messageFor } from '../lib/errors.js'
import { STATUS_LABEL, clock, eventTypeLabel, timeRange } from '../lib/schedule.js'

const LIST_DAYS = 91
const MAX_DATES = 31

export default function BlockDates({ scope, priests = [], selfId, selfName, onSessionEnd }) {
  const isParishScope = scope === 'parish'
  const { ask } = useConfirm()
  const [form, setForm] = useState({
    type: isParishScope ? 'parish' : 'priest',
    priestId: selfId ?? '',
    fromDate: '',
    toDate: '',
    startTime: '',
    endTime: '',
    reason: '',
  })
  const [blocks, setBlocks] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [several, setSeveral] = useState(false)
  const [dates, setDates] = useState([])
  const [picking, setPicking] = useState(false)

  const timed = form.type === 'priest'

  const load = useCallback(async () => {
    const from = todayISO()
    const to = isoOffset(LIST_DAYS)
    const r = await authed({ path: `/api/blocked-dates?from=${from}&to=${to}` })
    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setBlocks([])
      return
    }
    setBlocks(r.json.blocks)
  }, [onSessionEnd])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    if (blocks === null) return null
    if (isParishScope) return blocks
    return blocks.filter((block) => block.type === 'priest' && block.priestId === selfId)
  }, [blocks, isParishScope, selfId])

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  function toggleSeveral(event) {
    const on = event.target.checked
    setSeveral(on)
    setError('')

    if (!on) return
    if (form.fromDate) {
      setDates((current) =>
        current.includes(form.fromDate) ? current : [...current, form.fromDate].sort()
      )
    }
    setForm((current) => ({ ...current, fromDate: '', toDate: '' }))
  }

  function toggleDate(iso) {
    setError('')
    setDates((current) => {
      if (current.includes(iso)) return current.filter((date) => date !== iso)
      if (current.length >= MAX_DATES) {
        setError(MAX_DATES + ' dates at a time is the limit. Save these, then pick more.')
        return current
      }
      return [...current, iso].sort()
    })
  }

  function changeType(event) {
    const type = event.target.value
    setForm((current) => ({
      ...current,
      type,
      startTime: type === 'priest' ? current.startTime : '',
      endTime: type === 'priest' ? current.endTime : '',
    }))
  }

  async function submitSeveral(shared) {
    const chosen = [...dates].sort()
    const saved = []
    const failures = []
    const found = new Map()

    setPending(true)
    for (const date of chosen) {
      const r = await authed({
        method: 'POST',
        path: '/api/blocked-dates',
        body: { ...shared, fromDate: date },
      })

      if (isSessionError(r)) {
        setPending(false)
        onSessionEnd()
        return
      }
      if (!r.ok) {
        failures.push({ date, message: messageFor(r) })
        continue
      }

      saved.push(date)
      for (const item of r.json.warnings ?? []) found.set(item.eventId, item)
    }
    setPending(false)

    setDates(chosen.filter((date) => !saved.includes(date)))
    setWarnings([...found.values()])

    if (saved.length === 0) {
      setError(failures[0]?.message ?? 'Nothing was blocked.')
      return
    }

    setNotice(
      failures.length === 0
        ? saved.length + ' day' + (saved.length === 1 ? '' : 's') + ' blocked.'
        : saved.length +
            ' of ' +
            chosen.length +
            ' days blocked. The ones that failed are still listed on the form.'
    )
    if (failures.length > 0) setError(failures[0].message)
    setForm((current) => ({ ...current, reason: '' }))
    load()
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setWarnings([])

    if (several) {
      if (dates.length === 0) {
        setError('Pick at least one date to block.')
        return
      }
    } else {
      if (!form.fromDate) {
        setError('Choose the date to block.')
        return
      }
      if (form.fromDate < todayISO()) {
        setError('Only today or a later date can be blocked.')
        return
      }
      if (form.toDate && form.toDate < form.fromDate) {
        setError('The last day of the range cannot be before the first.')
        return
      }
    }

    if (timed) {
      if (Boolean(form.startTime) !== Boolean(form.endTime)) {
        setError('Give both a start and an end time, or leave both empty for the whole day.')
        return
      }
      if (form.startTime && form.startTime >= form.endTime) {
        setError('The end time must be later than the start time.')
        return
      }
    }
    if (form.type === 'priest' && !form.priestId) {
      setError('Choose which priest is unavailable.')
      return
    }

    const shared = { type: form.type }
    if (timed && form.startTime) {
      shared.startTime = form.startTime
      shared.endTime = form.endTime
    }
    if (form.reason.trim()) shared.reason = form.reason.trim()
    if (form.type === 'priest') shared.priestId = form.priestId

    if (several) {
      await submitSeveral(shared)
      return
    }

    const body = { ...shared, fromDate: form.fromDate }
    if (form.toDate) body.toDate = form.toDate

    setPending(true)
    const r = await authed({ method: 'POST', path: '/api/blocked-dates', body })
    setPending(false)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    const saved = r.json.blocks ?? []
    setNotice(
      saved.length === 1
        ? `${formatLongDate(saved[0].date)} is blocked.`
        : `${saved.length} days are blocked, from ${formatLongDate(body.fromDate)} to ${formatLongDate(body.toDate)}.`,
    )
    setWarnings(r.json.warnings ?? [])
    setForm((current) => ({ ...current, fromDate: '', toDate: '', reason: '' }))
    load()
  }

  async function remove(block) {
    const ok = await ask({
      title: 'Remove block',
      message: `Remove the block on ${formatLongDate(block.date)}?`,
      confirmLabel: 'Remove',
    })
    if (!ok) return
    setBusyId(block.blockedDateId)
    setError('')
    setNotice('')

    const r = await authed({ method: 'DELETE', path: `/api/blocked-dates/${block.blockedDateId}` })
    setBusyId(null)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setNotice('The block was removed. Events already scheduled were never touched.')
    load()
  }

  return (
    <>
      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <h2>{warnings.length} event{warnings.length === 1 ? '' : 's'} fall on blocked days</h2>
          </div>
          <p className="muted">
            The block is saved and these events were left exactly as they are — nothing was
            cancelled or moved. Reschedule or cancel each one as the parish decides.
          </p>
          <ul className="day-detail__list">
            {warnings.map((event) => (
              <li key={event.eventId}>
                <strong>{event.title}</strong>
                <span>
                  {formatWeekdayDate(event.eventDate)} · {clock(event.startTime)} ·{' '}
                  {eventTypeLabel(event)} · {event.assignedPriestName || 'No priest'} ·{' '}
                  {STATUS_LABEL[event.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="card form-card" onSubmit={submit}>
        <div className="form-grid">
          {isParishScope && (
            <label className="field">
              <span>Scope<b className="req">*</b></span>
              <select value={form.type} onChange={changeType}>
                <option value="parish">The whole parish</option>
                <option value="priest">One priest only</option>
              </select>
              <span className="form-hint">
                A parish block closes the whole day for everyone. A priest block affects only
                the events assigned to him, and may cover part of a day.
              </span>
            </label>
          )}

          {form.type === 'priest' &&
            (isParishScope ? (
              <label className="field">
                <span>Priest<b className="req">*</b></span>
                <select value={form.priestId} onChange={update('priestId')}>
                  <option value="">Choose…</option>
                  {priests.map((priest) => (
                    <option key={priest.userId} value={priest.userId}>
                      {priest.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Priest</span>
                <input value={selfName ?? 'You'} readOnly />
                <span className="form-hint">Your own unavailability.</span>
              </label>
            ))}

          <label className="check-line field--full">
            <input type="checkbox" checked={several} onChange={toggleSeveral} />
            <span className="check-line__text">
              Several dates that are not in a row. The same scope, hours and reason, saved as a
              separate block for each date you pick.
            </span>
          </label>

          {several ? (
            <div className="field field--full">
              <span>Dates<b className="req">*</b></span>
              <div className="date-add">
                <button type="button" className="btn btn--ghost" onClick={() => setPicking(true)}>
                  {dates.length > 0 ? 'Add or change dates' : 'Pick dates'}
                </button>
              </div>
              {dates.length > 0 ? (
                <ul className="date-list">
                  {dates.map((date) => (
                    <li key={date}>
                      <span className="date-list__text">{formatWeekdayDate(date)}</span>
                      <button type="button" className="text-btn" onClick={() => toggleDate(date)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="form-hint">
                  Press Pick dates to open the calendar. It shows what is already on each day, and
                  which events a block would land on.
                </span>
              )}
            </div>
          ) : (
            <>
              <label className="field">
                <span>From<b className="req">*</b></span>
                <input
                  type="date"
                  value={form.fromDate}
                  min={todayISO()}
                  onChange={update('fromDate')}
                />
              </label>

              <label className="field">
                <span>To</span>
                <input
                  type="date"
                  value={form.toDate}
                  min={form.fromDate || todayISO()}
                  onChange={update('toDate')}
                />
                <span className="form-hint">
                  Leave empty for a single day. A range is stored one day at a time, up to 31
                  days, and must be consecutive.
                </span>
              </label>
            </>
          )}

          {timed ? (
            <>
              <label className="field">
                <span>From time</span>
                <input type="time" value={form.startTime} onChange={update('startTime')} />
              </label>

              <label className="field">
                <span>To time</span>
                <input type="time" value={form.endTime} onChange={update('endTime')} />
                <span className="form-hint">Leave both empty for the whole day.</span>
              </label>
            </>
          ) : (
            <p className="muted form-hint field--full">
              A parish block always covers the whole day. To free part of a day, block the
              priest instead.
            </p>
          )}

          <label className="field field--full">
            <span>Reason</span>
            <input
              value={form.reason}
              onChange={update('reason')}
              placeholder={
                form.type === 'parish' ? 'e.g. Parish fiesta' : 'e.g. Retreat in Naga'
              }
            />
          </label>
        </div>

        <div className="form-actions">
          <p className="muted form-hint">
            Existing events are never changed by a block — you will be shown which ones it lands
            on.
          </p>
          <button type="submit" className="btn btn--gold" disabled={pending}>
            {pending
              ? 'Saving…'
              : several && dates.length > 0
                ? 'Block ' + dates.length + ' date' + (dates.length === 1 ? '' : 's')
                : 'Block these dates'}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel__head">
          <h2>{isParishScope ? 'Blocked dates' : 'Your unavailable dates'}</h2>
        </div>

        {shown === null ? (
          <Skeleton variant="lines" label="Loading blocked dates…" />
        ) : shown.length === 0 ? (
          <p className="empty">
            {isParishScope
              ? 'No date is blocked in the next three months.'
              : 'You have no unavailable dates in the next three months.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours</th>
                  {isParishScope && <th>Scope</th>}
                  <th>Reason</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((block) => (
                  <tr key={block.blockedDateId}>
                    <td>{formatWeekdayDate(block.date)}</td>
                    <td>{block.startTime ? timeRange(block.startTime, block.endTime) : 'Whole day'}</td>
                    {isParishScope && (
                      <td>{block.type === 'parish' ? 'Whole parish' : 'One priest'}</td>
                    )}
                    <td>{block.reason || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => remove(block)}
                        disabled={busyId === block.blockedDateId}
                      >
                        {busyId === block.blockedDateId ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DatePickerModal
        open={picking}
        intent="block"
        selected={dates}
        priestId={form.type === 'priest' ? form.priestId || null : null}
        onToggle={toggleDate}
        onClose={() => setPicking(false)}
        onSessionEnd={onSessionEnd}
      />
    </>
  )
}
