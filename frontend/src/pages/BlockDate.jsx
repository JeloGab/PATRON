import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEvents } from '../context/EventsContext.jsx'

export default function BlockDate() {
  const navigate = useNavigate()
  const { addBlock } = useEvents()
  const [form, setForm] = useState({ date: '', time: '', reason: '' })
  const [error, setError] = useState('')

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!form.date || !form.time || !form.reason.trim()) {
      setError('Enter the date, time, and reason.')
      return
    }
    addBlock(form)
    navigate('/schedule', { state: { showBlocked: true } })
  }

  return (
    <div className="page">
      <Link to="/schedule" className="back">
        ← Back to calendar
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Event scheduling</p>
          <h1>Add blocked date</h1>
          <p className="lede">
            Mark a date and time the parish cannot schedule. It appears in red on the calendar.
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={submit}>
        {error && <p className="alert">{error}</p>}
        <div className="form-grid">
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={update('date')} required />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={form.time} onChange={update('time')} required />
          </label>
          <label className="field field--full">
            <span>Reason</span>
            <input
              value={form.reason}
              onChange={update('reason')}
              placeholder="Parish recollection"
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <p className="form-hint muted">Blocked dates stay on this browser.</p>
          <div className="panel__actions">
            <Link to="/schedule" className="btn btn--ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn--gold">
              Add blocked date
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
