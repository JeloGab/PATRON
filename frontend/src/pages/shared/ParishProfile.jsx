// GET/PATCH /api/parish and /api/parish/priests; five editable fields.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authed, isSessionError } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { formatLongDate } from '../../lib/dates.js'
import { municipalityFromAddress } from '../../lib/parishes.js'
import { clearSession, getSession } from '../../lib/session.js'

const EDITABLE = ['name', 'address', 'contactNo', 'email', 'facebookPageId']

const PH_MOBILE = /^09\d{9}$/

function diff(initial, current) {
  const patch = {}
  for (const key of EDITABLE) {
    const before = initial[key] ?? ''
    const after = current[key] ?? ''
    if (before === after) continue

    patch[key] = after
  }
  return patch
}

function toForm(parish) {
  return {
    name: parish.name ?? '',
    address: parish.address ?? '',
    contactNo: parish.contactNo ?? '',
    email: parish.email ?? '',
    facebookPageId: parish.facebookPageId ?? '',
  }
}

export default function ParishProfile() {
  const navigate = useNavigate()
  const session = getSession()
  const [parish, setParish] = useState(null)
  const [priests, setPriests] = useState([])
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  const endSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let live = true

    async function load() {
      const r = await authed({ path: '/api/parish' })
      if (!live) return
      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        return
      }
      setParish(r.json.parish)
      setForm(toForm(r.json.parish))

      const p = await authed({ path: '/api/parish/priests' })
      if (live && p.ok) setPriests(p.json.priests)
    }

    load()
    return () => {
      live = false
    }
  }, [endSession])

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function cancel() {
    setForm(toForm(parish))
    setEditing(false)
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const patch = diff(toForm(parish), form)
    if (Object.keys(patch).length === 0) {
      setEditing(false)
      setNotice('Nothing was changed.')
      return
    }

    if (Object.hasOwn(patch, 'contactNo') && !PH_MOBILE.test(patch.contactNo.trim())) {
      setError('Contact number must be a PH mobile number, e.g. 09171234567.')
      return
    }

    setPending(true)
    const r = await authed({ method: 'PATCH', path: '/api/parish', body: patch })
    setPending(false)

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setParish(r.json.parish)
    setForm(toForm(r.json.parish))
    setEditing(false)
    setNotice('Parish details saved. The public directory shows them immediately.')
  }

  if (error && !parish) {
    return (
      <div className="page">
        <p className="alert" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (!parish || !form) {
    return (
      <div className="page">
        <p className="empty">Loading your parish…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Parish profile</p>
          <h1>{parish.name}</h1>
          <p className="lede">
            These are the details a parishioner sees in the public directory. Four of them —
            name, address, contact number and email — are the whole of that public listing, so a
            change here is a change to what the diocese sees.
          </p>
        </div>
        <p className="stat">
          <strong>{parish.status === 'active' ? 'Active' : parish.status}</strong>
          parish status
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="detail__grid">
        {editing ? (
          <form className="card form-card" onSubmit={save}>
            <p className="eyebrow">Edit details</p>
            <div className="form-grid">
              <label className="field field--full">
                <span>Parish name</span>
                <input value={form.name} onChange={update('name')} />
                <span className="form-hint">3 to 50 characters.</span>
              </label>
              <label className="field field--full">
                <span>Address</span>
                <input value={form.address} onChange={update('address')} />
                <span className="form-hint">
                  At least 5 characters. The directory derives the municipality from the last part
                  of this address, so end it with the town and province.
                </span>
              </label>
              <label className="field">
                <span>Contact number</span>
                <input
                  value={form.contactNo}
                  onChange={update('contactNo')}
                  placeholder="09171234567"
                />
                <span className="form-hint">PH mobile only — a landline is refused.</span>
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={update('email')} />
                <span className="form-hint">Optional. Clear it to remove it.</span>
              </label>
              <label className="field field--full">
                <span>Facebook page ID</span>
                <input value={form.facebookPageId} onChange={update('facebookPageId')} />
                <span className="form-hint">
                  Optional, and unvalidated. It is where announcements would be mirrored once the
                  page sync is built.
                </span>
              </label>
            </div>

            <div className="form-actions">
              <p className="muted form-hint">
                Only the fields you changed are sent. Nothing else about the parish is touched.
              </p>
              <div className="form-actions__buttons">
                <button type="button" className="btn btn--ghost" onClick={cancel}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--gold" disabled={pending}>
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <section className="card">
            <p className="eyebrow">Public details</p>
            <dl className="facts">
              <div>
                <dt>Parish name</dt>
                <dd>{parish.name}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{parish.address}</dd>
              </div>
              <div>
                <dt>Municipality</dt>
                <dd>{municipalityFromAddress(parish.address) || '—'}</dd>
              </div>
              <div>
                <dt>Contact number</dt>
                <dd>{parish.contactNo || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{parish.email || '—'}</dd>
              </div>
              <div>
                <dt>Facebook page ID</dt>
                <dd>{parish.facebookPageId || 'Not set'}</dd>
              </div>
            </dl>
            <button type="button" className="btn btn--gold" onClick={() => setEditing(true)}>
              Edit details
            </button>
          </section>
        )}

        <aside className="stack">
          <section className="card">
            <p className="eyebrow">Clergy</p>
            {priests.length === 0 ? (
              <p className="empty">No active priest is assigned to this parish.</p>
            ) : (
              <ul className="pills">
                {priests.map((priest) => (
                  <li key={priest.userId}>{priest.fullName}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <p className="eyebrow">Registry</p>
            <dl className="facts">
              <div>
                <dt>Registered</dt>
                <dd>{parish.createdAt ? formatLongDate(parish.createdAt.slice(0, 10)) : '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{parish.status === 'active' ? 'Active' : parish.status}</dd>
              </div>
              <div>
                <dt>Your role here</dt>
                <dd>{session?.role === 'priest' ? 'Parish priest' : 'Parish manager'}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
