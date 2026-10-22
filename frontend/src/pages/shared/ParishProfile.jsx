// GET/PATCH /api/parish and /api/parish/priests; five editable fields.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChurchMedia from '../../components/ChurchMedia.jsx'
import Loading from '../../components/Loading.jsx'
import PhotoDrop from '../../components/PhotoDrop.jsx'
import StaffPhoto from '../../components/StaffPhoto.jsx'
import { authed, isSessionError } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { formatLongDate } from '../../lib/dates.js'
import { LIMITS, accentFor, municipalityFromAddress } from '../../lib/parishes.js'
import { clearSession, getSession } from '../../lib/session.js'

const EDITABLE = [
  'name',
  'address',
  'contactNo',
  'email',
  'facebookPageId',
  'officeHours',
  'massSchedule',
]

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
    officeHours: parish.officeHours ?? '',
    massSchedule: parish.massSchedule ?? '',
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
  const [photoBusy, setPhotoBusy] = useState('')
  const [photoVersion, setPhotoVersion] = useState(0)

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

  async function uploadPhoto(files) {
    const file = files[0]
    if (!file) return
    setError('')
    setNotice('')

    if (file.size > 2 * 1024 * 1024) {
      setError('That image is larger than 2 MB.')
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('A parish photo must be a JPEG or a PNG.')
      return
    }

    setPhotoBusy('upload')
    const r = await authed({
      method: 'POST',
      path: '/api/parish/photo',
      raw: file,
      headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
    })
    setPhotoBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setParish(r.json.parish)
    setPhotoVersion((current) => current + 1)
    setNotice('The parish photo was updated. It shows on the public directory at once.')
  }

  async function removePhoto() {
    if (!window.confirm('Remove the parish photo?')) return
    setError('')
    setNotice('')
    setPhotoBusy('remove')
    const r = await authed({ method: 'DELETE', path: '/api/parish/photo' })
    setPhotoBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setParish(r.json.parish)
    setPhotoVersion((current) => current + 1)
    setNotice('The parish photo was removed. The directory shows the parish crest instead.')
  }

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
        <Loading label="Loading your parish…" />
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
            change here is a change to what the public sees.
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
        <div className="stack">
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

                <h3 className="eyebrow field--full">Shown to the public</h3>

                <label className="field field--full">
                  <span>Office hours</span>
                  <textarea
                    rows={3}
                    value={form.officeHours}
                    onChange={update('officeHours')}
                    maxLength={LIMITS.officeHours.max}
                    placeholder={'Monday to Friday, 8:00 AM - 5:00 PM\nSaturday, 8:00 AM - 12:00 NN\nClosed Sunday'}
                  />
                  <span className="form-hint">
                    Optional. One line each — the line breaks are kept exactly as you type them.
                    Up to {LIMITS.officeHours.max} characters. Clear it to remove it.
                  </span>
                </label>

                <label className="field field--full">
                  <span>Mass schedule</span>
                  <textarea
                    rows={5}
                    value={form.massSchedule}
                    onChange={update('massSchedule')}
                    maxLength={LIMITS.massSchedule.max}
                    placeholder={'Sunday, 6:00 / 8:00 / 10:00 AM and 5:00 PM\nWeekdays, 6:00 AM\nFirst Friday, 6:00 PM'}
                  />
                  <span className="form-hint">
                    Optional, and typed however your parish writes it — first Fridays, novenas and
                    anything else. Up to {LIMITS.massSchedule.max} characters.
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
              <div className="form-actions__buttons">
                <button type="button" className="btn btn--gold" onClick={() => setEditing(true)}>
                  Edit details
                </button>
              </div>
            </section>
          )}

          {!editing && (
            <section className="card">
              <p className="eyebrow">Schedule</p>
              <dl className="facts facts--stacked">
                <div>
                  <dt>Office hours</dt>
                  <dd className="schedule-text">{parish.officeHours || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Mass schedule</dt>
                  <dd className="schedule-text">{parish.massSchedule || 'Not set'}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="card">
            <p className="eyebrow">Parish photo</p>
            <ChurchMedia
              id={parish.parishId}
              accent={accentFor(parish.parishId)}
              className="parish-card__media"
              name={parish.name}
              alt={parish.name}
              version={photoVersion}
            />
            {parish.hasPhoto ? (
              <div className="form-actions__buttons">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={removePhoto}
                  disabled={photoBusy === 'remove'}
                >
                  {photoBusy === 'remove' ? 'Removing…' : 'Remove photo'}
                </button>
              </div>
            ) : (
              <PhotoDrop
                onFiles={uploadPhoto}
                accept="image/jpeg,image/png"
                busy={photoBusy === 'upload'}
                lead="Drag a photo of the church here"
                hint="JPEG or PNG, up to 2 MB. Shown on the public directory and on this parish's page."
              />
            )}
          </section>

          <section className="card">
            <p className="eyebrow">Clergy</p>
            {priests.length === 0 ? (
              <p className="empty">No active priest is assigned to this parish.</p>
            ) : (
              <ul className="clergy-cards">
                {priests.map((priest) => (
                  <li key={priest.userId} className="clergy-cards__item">
                    <StaffPhoto
                      userId={priest.userId}
                      name={priest.fullName}
                      hasPhoto={priest.hasPhoto}
                    />
                    <span className="clergy-cards__name">{priest.fullName}</span>
                  </li>
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
