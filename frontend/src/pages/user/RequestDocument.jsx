// A parishioner files a request — Path 1, first half.

import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Loading from '../../components/Loading.jsx'
import { authed, call, isSessionError } from '../../lib/api.js'
import {
  EARLIEST_SACRAMENT_YEAR,
  LIMITS,
  RECORD_TYPE_LABEL,
  RELATIONSHIPS,
} from '../../lib/documents.js'
import { messageFor } from '../../lib/errors.js'
import { ACCEPT, checkIdFile, contentTypeFor } from '../../lib/fileCheck.js'
import { clearSession, getSession } from '../../lib/session.js'

const EMPTY = {
  documentTypeId: '',
  relationship: 'self',
  purpose: '',
  subjectName: '',
  subjectBirthDate: '',
  fatherName: '',
  motherName: '',
  sacramentYear: '',
  notes: '',
  invoiceNo: '',
}

export default function RequestDocument() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getSession()
  const [parish, setParish] = useState(null)
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [lookupError, setLookupError] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  // The ID is a second request by necessity — the row must exist before it can carry a
  // file — so it is held here and uploaded right after the create succeeds.
  const [idFile, setIdFile] = useState(null)

  useEffect(() => {
    let live = true

    async function load() {
      const [p, t] = await Promise.all([
        call({ path: `/api/parishes/${encodeURIComponent(id)}` }),
        call({ path: '/api/document-types' }),
      ])
      if (!live) return

      if (!p.ok) setLookupError(messageFor(p))
      else setParish(p.json.parish)

      if (t.ok) {
        setTypes(t.json.documentTypes)

        if (t.json.documentTypes.length > 0) {
          setForm((current) => ({
            ...current,
            documentTypeId: current.documentTypeId || t.json.documentTypes[0].documentTypeId,
          }))
        }
      } else {
        setError(messageFor(t))
      }
      setLoading(false)
    }

    load()
    return () => {
      live = false
    }
  }, [id])

  if (!user) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading the request form…" />
      </div>
    )
  }

  if (!parish) {
    return (
      <div className="page">
        <p className="empty">
          {lookupError || 'This parish is not listed in the directory. It may have been deactivated.'}
        </p>
        <Link to="/user" className="btn btn--gold">
          Back to parishes
        </Link>
      </div>
    )
  }

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const chosen = types.find((type) => type.documentTypeId === form.documentTypeId) ?? null

  async function submit(event) {
    event.preventDefault()
    setError('')

    const subjectName = form.subjectName.trim().replace(/\s+/g, ' ')
    const purpose = form.purpose.trim().replace(/\s+/g, ' ')
    const invoiceNo = form.invoiceNo.trim().replace(/\s+/g, ' ')

    if (!form.documentTypeId) {
      setError('Choose which certificate you need.')
      return
    }
    if (subjectName.length < LIMITS.subjectName.min || subjectName.length > LIMITS.subjectName.max) {
      setError(
        `The name on the document must be ${LIMITS.subjectName.min} to ${LIMITS.subjectName.max} characters.`,
      )
      return
    }
    if (purpose.length < LIMITS.purpose.min || purpose.length > LIMITS.purpose.max) {
      setError(
        `Say what the certificate is for — ${LIMITS.purpose.min} to ${LIMITS.purpose.max} characters.`,
      )
      return
    }
    if (form.sacramentYear) {
      const year = Number(form.sacramentYear)
      const thisYear = new Date().getFullYear()
      if (!/^\d{4}$/.test(form.sacramentYear) || year < EARLIEST_SACRAMENT_YEAR || year > thisYear) {
        setError(`The year of the sacrament must be between ${EARLIEST_SACRAMENT_YEAR} and ${thisYear}.`)
        return
      }
    }
    if (invoiceNo.length < LIMITS.invoiceNo.min || invoiceNo.length > LIMITS.invoiceNo.max) {
      setError(
        `Enter the reference number of your payment — ${LIMITS.invoiceNo.min} to ${LIMITS.invoiceNo.max} characters. Pay the parish first, then file this request.`,
      )
      return
    }

    const badFile = await checkIdFile(idFile)
    if (badFile) {
      setError(badFile)
      return
    }

    const body = {
      parishId: parish.parishId,
      documentTypeId: form.documentTypeId,
      relationship: form.relationship,
      purpose,
      subjectName,
      invoiceNo,
    }
    if (form.subjectBirthDate) body.subjectBirthDate = form.subjectBirthDate
    if (form.fatherName.trim()) body.fatherName = form.fatherName.trim()
    if (form.motherName.trim()) body.motherName = form.motherName.trim()
    if (form.sacramentYear) body.sacramentYear = form.sacramentYear
    if (form.notes.trim()) body.notes = form.notes.trim()

    setPending(true)
    const r = await authed({ method: 'POST', path: '/api/requests', body })
    setPending(false)

    if (isSessionError(r)) {
      clearSession()
      navigate('/login', { replace: true })
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    const applicationId = r.json.request.applicationId

    // The request exists from here on. If the ID upload fails the request is still
    // valid — it just has no file — so say so plainly rather than losing the request,
    // and send them on to My requests where the office can be asked for it.
    if (idFile) {
      setPending(true)
      const upload = await authed({
        method: 'POST',
        path: `/api/requests/${encodeURIComponent(applicationId)}/id-file`,
        raw: idFile,
        headers: {
          'Content-Type': await contentTypeFor(idFile),
          'X-File-Name': encodeURIComponent(idFile.name),
        },
      })
      setPending(false)

      if (isSessionError(upload)) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }
      if (!upload.ok) {
        setError(
          `Your request was filed, but the ID did not upload (${messageFor(upload)}). Open it under My requests to try again.`,
        )
        return
      }
    }

    navigate(`/user/requests?submitted=${applicationId}`, { replace: true })
  }

  return (
    <div className="page">
      <Link to={`/user/parish/${parish.parishId}`} className="back">
        ← Back to parish
      </Link>

      <header className="page__hero">
        <div>
          <p className="eyebrow">Document request</p>
          <h1>Request a certificate</h1>
          <p className="lede">
            Applying to <strong>{parish.name}</strong>. The office looks for the register entry
            first, then a priest approves the issuance — so the more identifying detail you give,
            the faster the entry is found.
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={submit}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <div className="form-grid">
          <label className="field field--full">
            <span>Certificate *</span>
            <select value={form.documentTypeId} onChange={update('documentTypeId')}>
              {types.map((type) => (
                <option key={type.documentTypeId} value={type.documentTypeId}>
                  {type.name}
                </option>
              ))}
            </select>
            {chosen && (
              <span className="form-hint">
                {chosen.description
                  ? `${chosen.description} `
                  : ''}
                Searched against the {RECORD_TYPE_LABEL[chosen.recordType]?.toLowerCase()} register.
              </span>
            )}
          </label>

          <label className="field">
            <span>Who is this certificate for? *</span>
            <select value={form.relationship} onChange={update('relationship')}>
              {RELATIONSHIPS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="form-hint">Your relationship to the person named on the document.</span>
          </label>

          <label className="field">
            <span>Name on the document *</span>
            <input
              value={form.subjectName}
              onChange={update('subjectName')}
              placeholder="Full name as written in the register"
            />
          </label>

          <label className="field">
            <span>Date of birth</span>
            <input type="date" value={form.subjectBirthDate} onChange={update('subjectBirthDate')} />
            <span className="form-hint">Optional, but it is the strongest way to tell two people of the same name apart.</span>
          </label>

          <label className="field">
            <span>Year of the sacrament</span>
            <input
              value={form.sacramentYear}
              onChange={update('sacramentYear')}
              placeholder="e.g. 1998"
              inputMode="numeric"
              maxLength={4}
            />
            <span className="form-hint">Optional. {EARLIEST_SACRAMENT_YEAR} or later.</span>
          </label>

          <label className="field">
            <span>Father’s name</span>
            <input value={form.fatherName} onChange={update('fatherName')} />
          </label>

          <label className="field">
            <span>Mother’s name</span>
            <input value={form.motherName} onChange={update('motherName')} />
            <span className="form-hint">Her name as it appears in the register, maiden name included.</span>
          </label>

          <label className="field field--full">
            <span>What is it for? *</span>
            <input
              value={form.purpose}
              onChange={update('purpose')}
              placeholder="e.g. Marriage requirements, school enrolment, passport application"
            />
          </label>

          <label className="field field--full">
            <span>Anything else that would help</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={update('notes')}
              placeholder="A former surname, the chapel where it took place, a sibling baptised the same day"
            />
          </label>

          <h3 className="eyebrow field--full">Payment and identification</h3>

          <label className="field field--full">
            <span>Payment reference number *</span>
            <input
              value={form.invoiceNo}
              onChange={update('invoiceNo')}
              placeholder="The reference number from your payment"
              maxLength={LIMITS.invoiceNo.max}
            />
            <span className="form-hint">
              <strong>Pay {parish.name} first</strong>, then enter the reference number your
              payment gave you here. Contact the parish office
              {parish.contactNo ? ` at ${parish.contactNo}` : ''} if you are unsure how to pay.
              The office checks this number against its records before the request is processed.
            </span>
          </label>

          <label className="field field--full">
            <span>Photo or scan of a valid ID</span>
            <input
              type="file"
              accept={ACCEPT}
              onChange={(event) => setIdFile(event.target.files?.[0] ?? null)}
            />
            <span className="form-hint">
              Optional, and only useful if you are requesting this for someone else — it is how
              the office checks the relationship you stated above. A walk-in shows their ID at
              the counter instead. JPEG, PNG, WebP or PDF, up to 5 MB.
            </span>
          </label>
        </div>

        <div className="form-actions">
          <p className="muted form-hint">
            Your name and email are already on your account, so the office can reach you — there is
            nothing to type twice. You can withdraw this request yourself while it is still
            pending.
          </p>
          <button type="submit" className="btn btn--gold" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  )
}
