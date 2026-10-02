import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEvents } from '../context/EventsContext.jsx'
import { PRIESTS, SACRAMENTS } from '../data/mock.js'

const KINDS = [
  {
    id: 'sacramental',
    title: 'Sacramental',
    text: 'Wedding, baptism, and other rites. Includes the priest and the number of participants.',
  },
  {
    id: 'general',
    title: 'General',
    text: 'A parish event that only needs a title, date, and time.',
  },
  {
    id: 'seminar',
    title: 'Seminar',
    text: 'A seminar that only needs a title, date, and time.',
  },
]

const EMPTY = {
  sacrament: '',
  priest: '',
  title: '',
  date: '',
  time: '',
  participants: '',
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const { addEvent } = useEvents()
  const [kind, setKind] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const sacramental = kind === 'sacramental'

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  function chooseKind(next) {
    setKind(next)
    setForm(EMPTY)
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.date || !form.time) {
      setError('Complete every field before creating the event.')
      return
    }

    if (sacramental) {
      if (!form.sacrament || !form.priest) {
        setError('Complete every field before creating the event.')
        return
      }
      const participants = Number(form.participants)
      if (!Number.isInteger(participants) || participants < 1) {
        setError('Enter the number of participants as a whole number greater than zero.')
        return
      }
    }

    const created = addEvent({ ...form, category: kind })
    navigate('/', { state: { createdTitle: created.title } })
  }

  return (
    <div className="page">
      <Link to="/" className="back">
        ← Back to dashboard
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Event scheduling</p>
          <h1>Create event</h1>
          <p className="lede">
            {kind
              ? 'This event is stored in this browser and shows on the dashboard and the calendar.'
              : 'Choose whether this event is sacramental, general, or a seminar.'}
          </p>
        </div>
      </header>

      {kind == null ? (
        <div className="kind-grid" role="group" aria-label="Event kind">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kind-card kind-card--${item.id}`}
              onClick={() => chooseKind(item.id)}
            >
              <span className="kind-card__swatch" aria-hidden="true" />
              <span className="kind-card__title">{item.title}</span>
              <span className="kind-card__text">{item.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <form className="card form-card" onSubmit={submit}>
          {error && <p className="alert">{error}</p>}

          <div className="form-grid">
            {sacramental && (
              <>
                <label className="field">
                  <span>Sacrament</span>
                  <select value={form.sacrament} onChange={update('sacrament')} required>
                    <option value="">Select a sacrament</option>
                    {SACRAMENTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Assigned priest</span>
                  <select value={form.priest} onChange={update('priest')} required>
                    <option value="">Select a priest</option>
                    {PRIESTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="field field--full">
              <span>Title</span>
              <input
                value={form.title}
                onChange={update('title')}
                placeholder={
                  kind === 'seminar'
                    ? 'Baptismal seminar'
                    : kind === 'general'
                      ? 'Parish council meeting'
                      : 'Santos and Reyes wedding'
                }
                required
              />
            </label>

            <label className="field">
              <span>Date</span>
              <input type="date" value={form.date} onChange={update('date')} required />
            </label>

            <label className="field">
              <span>Time</span>
              <input type="time" value={form.time} onChange={update('time')} required />
            </label>

            {sacramental && (
              <label className="field">
                <span>No. of participants</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.participants}
                  onChange={update('participants')}
                  placeholder="80"
                  required
                />
              </label>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="text-btn" onClick={() => chooseKind(null)}>
              Choose a different kind
            </button>
            <div className="panel__actions">
              <Link to="/" className="btn btn--ghost">
                Cancel
              </Link>
              <button type="submit" className="btn btn--gold">
                Create event
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
