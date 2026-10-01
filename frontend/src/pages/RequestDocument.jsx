import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { churches } from '../data/mock.js'
import { getSession } from '../lib/session.js'
import { createRequest, DOCUMENT_TYPES } from '../lib/requests.js'

export default function RequestDocument() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getSession()
  const church = churches.find((item) => item.id === id)

  const [form, setForm] = useState({
    documentType: DOCUMENT_TYPES[0],
    subjectName: user?.name || '',
    birthDate: '',
    sacramentDate: '',
    purpose: '',
    contactPhone: '',
    contactEmail: user?.email || '',
    notes: '',
  })
  const [error, setError] = useState('')

  if (!user) return <Navigate to="/login" replace />

  if (!church) {
    return (
      <div className="page">
        <p className="empty">This parish is not in the directory.</p>
        <Link to="/" className="btn btn--gold">
          Back to parishes
        </Link>
      </div>
    )
  }

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!form.subjectName.trim() || !form.documentType || !form.purpose.trim()) {
      setError('Please complete the required fields before submitting.')
      return
    }
    if (!form.contactEmail.trim()) {
      setError('A contact email is required so the parish can reach you.')
      return
    }

    const request = createRequest({
      churchId: church.id,
      churchName: church.name,
      diocese: church.diocese,
      requesterName: user.name,
      requesterEmail: user.email,
      documentType: form.documentType,
      subjectName: form.subjectName.trim(),
      birthDate: form.birthDate,
      sacramentDate: form.sacramentDate,
      purpose: form.purpose.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      notes: form.notes.trim(),
    })

    navigate(`/requests?submitted=${request.id}`, { replace: true })
  }

  return (
    <div className="page">
      <Link to={`/parish/${church.id}`} className="back">
        ← Back to parish
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Document request</p>
          <h1>Request a certificate</h1>
          <p className="lede">
            Submit an application to <strong>{church.name}</strong>. Your request will be marked
            pending until the parish manager reviews and approves it.
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={submit}>
        {error && <p className="alert">{error}</p>}

        <div className="form-grid">
          <label className="field">
            <span>Document type *</span>
            <select value={form.documentType} onChange={update('documentType')}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Name on the document *</span>
            <input
              value={form.subjectName}
              onChange={update('subjectName')}
              placeholder="Full name as it should appear"
            />
          </label>

          <label className="field">
            <span>Date of birth</span>
            <input type="date" value={form.birthDate} onChange={update('birthDate')} />
          </label>

          <label className="field">
            <span>Date of sacrament / event</span>
            <input type="date" value={form.sacramentDate} onChange={update('sacramentDate')} />
          </label>

          <label className="field field--full">
            <span>Purpose of request *</span>
            <input
              value={form.purpose}
              onChange={update('purpose')}
              placeholder="e.g. Marriage requirements, school enrollment, personal record"
            />
          </label>

          <label className="field">
            <span>Contact phone</span>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={update('contactPhone')}
              placeholder="09xxxxxxxxx"
            />
          </label>

          <label className="field">
            <span>Contact email *</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={update('contactEmail')}
            />
          </label>

          <label className="field field--full">
            <span>Additional notes</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={update('notes')}
              placeholder="Parents’ names, registry clues, or other details that can help the parish find the record"
            />
          </label>
        </div>

        <div className="form-actions">
          <p className="muted form-hint">
            After you submit, the request status will be <strong>Pending</strong> until the parish
            manager approves it. A PDF copy will be issued later once approved.
          </p>
          <button type="submit" className="btn btn--gold">
            Submit request
          </button>
        </div>
      </form>
    </div>
  )
}
