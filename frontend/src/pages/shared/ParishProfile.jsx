// GET/PATCH /api/parish and /api/parish/priests; eleven editable fields.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChurchMedia from '../../components/ChurchMedia.jsx'
import FacebookPageCard from '../../components/FacebookPageCard.jsx'
import Loading from '../../components/Loading.jsx'
import PhotoDrop from '../../components/PhotoDrop.jsx'
import StaffPhoto from '../../components/StaffPhoto.jsx'
import { BASE, authed, isSessionError } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { formatLongDate } from '../../lib/dates.js'
import { LIMITS, YEAR_ESTABLISHED_MIN, accentFor, municipalityFromAddress } from '../../lib/parishes.js'
import { clearSession, getSession } from '../../lib/session.js'

const EDITABLE = [
  'name',
  'address',
  'contactNo',
  'email',
  'facebookPageId',
  'officeHours',
  'massSchedule',
  'patronSaint',
  'feastDay',
  'yearEstablished',
  'history',
]

const PH_MOBILE = /^09\d{9}$/

const MAX_GALLERY = 4
const MAX_GALLERY_BYTES = 5 * 1024 * 1024
const MAX_SEAL_BYTES = 1 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png']

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
    patronSaint: parish.patronSaint ?? '',
    feastDay: parish.feastDay ?? '',
    // yearEstablished arrives as a number; the input and diff() both work in strings.
    yearEstablished: parish.yearEstablished == null ? '' : String(parish.yearEstablished),
    history: parish.history ?? '',
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
  const [gallery, setGallery] = useState([])
  const [galleryBusy, setGalleryBusy] = useState('')
  const [sealBusy, setSealBusy] = useState('')
  const [sealVersion, setSealVersion] = useState(0)

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

      const g = await authed({ path: '/api/parish/gallery' })
      if (live && g.ok) setGallery(g.json.images)
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

  async function uploadGallery(files) {
    setError('')
    setNotice('')

    const room = MAX_GALLERY - gallery.length
    if (room <= 0) {
      setError('This parish already has four photos. Remove one first.')
      return
    }

    const rejected = []
    const accepted = []
    for (const file of files.slice(0, room)) {
      if (file.size > MAX_GALLERY_BYTES) rejected.push(`${file.name} is larger than 5 MB`)
      else if (!IMAGE_TYPES.includes(file.type)) rejected.push(`${file.name} is not a JPEG or a PNG`)
      else accepted.push(file)
    }
    if (files.length > room) {
      rejected.push(room === 1 ? 'only one more photo fits' : `only ${room} more photos fit`)
    }

    let added = 0
    for (const [index, file] of accepted.entries()) {
      setGalleryBusy(`Uploading ${index + 1} of ${accepted.length}…`)
      const r = await authed({
        method: 'POST',
        path: '/api/parish/gallery',
        raw: file,
        headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
      })

      if (isSessionError(r)) {
        setGalleryBusy('')
        endSession()
        return
      }
      if (!r.ok) {
        setGalleryBusy('')
        setError(messageFor(r))
        if (added > 0) {
          setNotice(`${added} ${added === 1 ? 'photograph was' : 'photographs were'} added before this one failed.`)
        }
        return
      }

      setGallery(r.json.images)
      added += 1
    }
    setGalleryBusy('')

    if (added > 0) {
      setNotice(
        `${added} ${added === 1 ? 'photograph' : 'photographs'} added. They show on the parish page at once.`,
      )
    }
    if (rejected.length > 0) setError(`Not uploaded — ${rejected.join('; ')}.`)
  }

  async function removeGalleryPhoto(imageId) {
    if (!window.confirm('Remove this photograph?')) return
    setError('')
    setNotice('')
    setGalleryBusy('Removing…')
    const r = await authed({ method: 'DELETE', path: `/api/parish/gallery/${imageId}` })
    setGalleryBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setGallery(r.json.images)
    setNotice('The photograph was removed.')
  }

  async function uploadSeal(files) {
    const file = files[0]
    if (!file) return
    setError('')
    setNotice('')

    if (file.size > MAX_SEAL_BYTES) {
      setError('That image is larger than 1 MB.')
      return
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('A parish seal must be a JPEG or a PNG.')
      return
    }

    setSealBusy('upload')
    const r = await authed({
      method: 'POST',
      path: '/api/parish/seal',
      raw: file,
      headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
    })
    setSealBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setParish(r.json.parish)
    setSealVersion((current) => current + 1)
    setNotice('The parish seal was updated. It prints on every certificate, including those already issued.')
  }

  async function removeSeal() {
    if (!window.confirm('Remove the parish seal?')) return
    setError('')
    setNotice('')
    setSealBusy('remove')
    const r = await authed({ method: 'DELETE', path: '/api/parish/seal' })
    setSealBusy('')

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setParish(r.json.parish)
    setSealVersion((current) => current + 1)
    setNotice('The parish seal was removed. Certificates print without it.')
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
            These are the details a parishioner sees in the public directory. Everything here
            except the Facebook page ID is part of that public listing, so a change here is a
            change to what the public sees.
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
                  <span>Parish name<b className="req">*</b></span>
                  <input value={form.name} onChange={update('name')} />
                </label>
                <label className="field field--full">
                  <span>Address<b className="req">*</b></span>
                  <input
                    value={form.address}
                    onChange={update('address')}
                    placeholder="Barangay, Town, Province"
                  />
                </label>
                <label className="field">
                  <span>Contact number<b className="req">*</b></span>
                  <input
                    value={form.contactNo}
                    onChange={update('contactNo')}
                    placeholder="09171234567"
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={update('email')} />
                </label>
                <label className="field field--full">
                  <span>Facebook page ID</span>
                  <input value={form.facebookPageId} onChange={update('facebookPageId')} />
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
                </label>

                <label className="field">
                  <span>Patron saint</span>
                  <input
                    value={form.patronSaint}
                    onChange={update('patronSaint')}
                    maxLength={LIMITS.patronSaint.max}
                    placeholder="St. Joseph the Worker"
                  />
                </label>

                <label className="field">
                  <span>Feast day</span>
                  <input
                    value={form.feastDay}
                    onChange={update('feastDay')}
                    maxLength={LIMITS.feastDay.max}
                    placeholder="May 1"
                  />
                </label>

                <label className="field">
                  <span>Year established</span>
                  <input
                    inputMode="numeric"
                    value={form.yearEstablished}
                    onChange={update('yearEstablished')}
                    maxLength={4}
                    placeholder="1898"
                  />
                </label>

                <label className="field field--full">
                  <span>History</span>
                  <textarea
                    rows={8}
                    value={form.history}
                    onChange={update('history')}
                    maxLength={LIMITS.history.max}
                    placeholder={'The parish was established in 1898 as a visita of…\n\nThe present church was built in…'}
                  />
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
                  <dt>Patron saint</dt>
                  <dd>{parish.patronSaint || '—'}</dd>
                </div>
                <div>
                  <dt>Feast day</dt>
                  <dd>{parish.feastDay || '—'}</dd>
                </div>
                <div>
                  <dt>Year established</dt>
                  <dd>{parish.yearEstablished || '—'}</dd>
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

          {!editing && parish.history && (
            <section className="card">
              <p className="eyebrow">About this parish</p>
              <p className="schedule-text">{parish.history}</p>
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
            <p className="eyebrow">
              Photographs <span className="gallery-count">{gallery.length} of {MAX_GALLERY}</span>
            </p>

            {gallery.length > 0 && (
              <ul className="gallery-grid">
                {gallery.map((image) => (
                  <li key={image.imageId} className="gallery-tile">
                    <img
                      src={`${BASE}/api/parishes/${parish.parishId}/gallery/${image.imageId}`}
                      alt={image.fileName}
                      loading="lazy"
                    />
                    <button
                      type="button"
                      className="gallery-tile__remove"
                      onClick={() => removeGalleryPhoto(image.imageId)}
                      disabled={Boolean(galleryBusy)}
                      aria-label={`Remove ${image.fileName}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {gallery.length < MAX_GALLERY ? (
              <PhotoDrop
                onFiles={uploadGallery}
                accept="image/jpeg,image/png"
                multiple
                busy={Boolean(galleryBusy)}
                busyLead={galleryBusy}
                lead="Drag photos of the church here"
                hint="JPEG or PNG, up to 5 MB each. Four at most. These upload straight away — Cancel on Edit details will not undo them."
              />
            ) : (
              <p className="muted">Four photographs is the limit. Remove one to add another.</p>
            )}
          </section>

          <section className="card">
            <p className="eyebrow">Parish seal</p>
            {parish.hasSeal ? (
              <>
                <img
                  className="seal-preview"
                  src={`${BASE}/api/parishes/${parish.parishId}/seal?v=${sealVersion}`}
                  alt={`Seal of ${parish.name}`}
                />
                <p className="muted">
                  Printed on the right of every certificate. The left is reserved for the diocese
                  logo.
                </p>
                <div className="form-actions__buttons">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={removeSeal}
                    disabled={sealBusy === 'remove'}
                  >
                    {sealBusy === 'remove' ? 'Removing…' : 'Remove seal'}
                  </button>
                </div>
              </>
            ) : (
              <PhotoDrop
                onFiles={uploadSeal}
                accept="image/jpeg,image/png"
                busy={sealBusy === 'upload'}
                lead="Drag the parish seal here"
                hint="JPEG or PNG, up to 1 MB. A square image on a plain background prints best."
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

          <FacebookPageCard
            parish={parish}
            onChanged={setParish}
            onSessionEnd={endSession}
          />

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
