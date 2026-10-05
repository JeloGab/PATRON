import { useState } from 'react'
import StatusPill from '../components/StatusPill.jsx'
import { useOffice } from '../context/OfficeContext.jsx'
import { MANAGER_NAME } from '../data/mock.js'
import { formatLongDate, todayISO } from '../lib/dates.js'

const EMPTY_DRAFT = { title: '', body: '', facebookSynced: false }

export default function Announcements() {
  const { announcements, addAnnouncement } = useOffice()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [error, setError] = useState('')

  function closeForm() {
    setCreating(false)
    setDraft(EMPTY_DRAFT)
    setError('')
  }

  function send(event) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.body.trim()) {
      setError('Enter a title and a description.')
      return
    }
    addAnnouncement({
      id: `ann-${Date.now().toString(36)}`,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: todayISO(),
      createdBy: MANAGER_NAME,
      status: 'For approval',
      facebookSynced: draft.facebookSynced,
    })
    closeForm()
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Announcements</p>
          <h1>Parish bulletin</h1>
          <p className="lede">Notices prepared by the parish office for the community.</p>
        </div>
        <div className="panel__actions">
          <p className="stat">
            <strong>{announcements.length}</strong>
            notices
          </p>
          <button type="button" className="btn btn--gold" onClick={() => setCreating((open) => !open)}>
            Create announcement
          </button>
        </div>
      </header>

      {creating && (
        <form className="card editor" onSubmit={send}>
          <p className="eyebrow">New announcement</p>
          <h2>Create announcement</h2>
          {error && <p className="alert">{error}</p>}
          <div className="form-grid">
            <label className="field field--full">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className="field field--full">
              <span>Description</span>
              <textarea
                rows={4}
                value={draft.body}
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            className={`switch ${draft.facebookSynced ? 'is-on' : ''}`}
            aria-pressed={draft.facebookSynced}
            onClick={() =>
              setDraft((current) => ({ ...current, facebookSynced: !current.facebookSynced }))
            }
          >
            <span className="switch__track" aria-hidden="true">
              <span className="switch__knob" />
            </span>
            Facebook synced
          </button>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold">
              Send to Parish Priest
            </button>
          </div>
        </form>
      )}

      <ul className="request-list">
        {announcements.map((item) => (
          <li key={item.id} className="card">
            <div className="bulletin__top">
              <p className="eyebrow">{formatLongDate(item.date)}</p>
              <StatusPill status={item.status} />
              <span className={`fb-pill ${item.facebookSynced ? 'is-on' : ''}`}>
                {item.facebookSynced ? 'Facebook synced' : 'Not on Facebook'}
              </span>
            </div>
            <h2>{item.title}</h2>
            <p className="bulletin__by">Created by {item.createdBy}</p>
            <p className="muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
