import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useParish } from '../context/ParishContext.jsx'

export default function UnavailableDate() {
  const navigate = useNavigate()
  const { addUnavailable } = useParish()
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
    addUnavailable(form)
    navigate('/', { state: { showUnavailable: true } })
  }

  return (
    <div className="page">
      <Link to="/" className="back">
        ← Back to my calendar
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">My calendar</p>
          <h1>Add unavailable date</h1>
          <p className="lede">
            Mark a date and time you cannot take an assignment. It appears on your calendar beside
            the dates the church has blocked.
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
              placeholder="Retreat, travel, or another commitment"
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <p className="form-hint muted">Unavailable dates stay on this browser.</p>
          <div className="panel__actions">
            <Link to="/" className="btn btn--ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn--gold">
              Add unavailable date
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
