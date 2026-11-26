// Editing an entry and its subjects; both forms diff against what they loaded.

import { useState } from 'react'
import {
  OFFICIANT_MAX,
  OFFICIANT_TITLES,
  joinOfficiant,
  officiantNameLimit,
  splitOfficiant,
} from '../lib/officiant.js'

const BIRTH_DATE_REQUIRED = new Set(['baptism', 'confirmation'])

function diff(initial, current, dateKeys) {
  const patch = {}
  for (const key of Object.keys(current)) {
    const before = initial[key] ?? ''
    const after = current[key] ?? ''
    if (before === after) continue
    patch[key] = after === '' && dateKeys.has(key) ? null : after
  }
  return patch
}

export function RecordEditForm({ record, onSave, onCancel }) {
  const [form, setForm] = useState({
    bookNo: record.bookNo ?? '',
    pageNo: record.pageNo ?? '',
    entryNo: record.entryNo ?? '',
    recordDate: record.recordDate ?? '',
    officiantName: record.officiantName ?? '',
    ...(record.recordType === 'death' ? { dateOfDeath: record.dateOfDeath ?? '' } : {}),
  })
  const [officiant, setOfficiant] = useState(() => splitOfficiant(record.officiantName))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setOfficiantPart(part, value) {
    const next = { ...officiant, [part]: value }
    setOfficiant(next)
    set('officiantName', joinOfficiant(next.title, next.name))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.bookNo.trim() || !form.pageNo.trim() || !form.entryNo.trim()) {
      setError('Book, page and entry numbers are all required.')
      return
    }
    if (!form.recordDate) {
      setError('The date of the sacrament is required.')
      return
    }
    if (!form.officiantName.trim()) {
      setError("The officiant's name is required.")
      return
    }
    if (form.officiantName.length > OFFICIANT_MAX) {
      setError(`The title and name together cannot be longer than ${OFFICIANT_MAX} characters.`)
      return
    }

    const patch = diff(record, form, new Set(['recordDate', 'dateOfDeath']))
    if (Object.keys(patch).length === 0) {
      setError('Nothing was changed.')
      return
    }

    setPending(true)
    const message = await onSave(patch)
    setPending(false)
    if (message) setError(message)
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="eyebrow field--full">Edit entry</p>

      {error && (
        <p className="alert field--full" role="alert">
          {error}
        </p>
      )}

      <label className="field">
        <span>Book no.<b className="req">*</b></span>
        <input value={form.bookNo} onChange={(e) => set('bookNo', e.target.value)} />
      </label>
      <label className="field">
        <span>Page no.<b className="req">*</b></span>
        <input value={form.pageNo} onChange={(e) => set('pageNo', e.target.value)} />
      </label>
      <label className="field">
        <span>Entry no.<b className="req">*</b></span>
        <input value={form.entryNo} onChange={(e) => set('entryNo', e.target.value)} />
      </label>

      <label className="field">
        <span>Date of sacrament<b className="req">*</b></span>
        <input
          type="date"
          value={form.recordDate}
          onChange={(e) => set('recordDate', e.target.value)}
        />
        <span className="form-hint">Must be today or earlier.</span>
      </label>

      {record.recordType === 'death' && (
        <label className="field">
          <span>Date of death</span>
          <input
            type="date"
            value={form.dateOfDeath}
            onChange={(e) => set('dateOfDeath', e.target.value)}
          />
        </label>
      )}

      <div className="field field--full">
        <span>Officiant<b className="req">*</b></span>
        <div className="officiant-row">
          <select
            aria-label="Officiant's title"
            value={officiant.title}
            onChange={(e) => setOfficiantPart('title', e.target.value)}
          >
            <option value="">No title</option>
            {OFFICIANT_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <input
            aria-label="Officiant's name"
            value={officiant.name}
            onChange={(e) => setOfficiantPart('name', e.target.value)}
            maxLength={officiantNameLimit(officiant.title)}
          />
        </div>
        <span className="form-hint">
          An entry that does not begin with one of these titles keeps its whole wording in the
          name box, exactly as the register holds it.
        </span>
      </div>

      <div className="form-actions field--full">
        <p className="form-hint muted">
          The register type cannot be changed, so it is not shown here.
        </p>
        <div className="form-actions__buttons">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn--gold" disabled={pending}>
            {pending ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function SubjectEditForm({ record, subject, onSave, onCancel }) {
  const [form, setForm] = useState({
    fullName: subject.fullName ?? '',
    gender: subject.gender ?? 'male',
    dateOfBirth: subject.dateOfBirth ?? '',
    placeOfBirth: subject.placeOfBirth ?? '',
    fatherName: subject.fatherName ?? '',
    motherName: subject.motherName ?? '',
    sponsorNames: subject.sponsorNames ?? '',
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const genderFrozen = record.subjects.length === 2
  const needsBirthDate = BIRTH_DATE_REQUIRED.has(record.recordType)

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.fullName.trim()) {
      setError('The full name is required.')
      return
    }
    if (needsBirthDate && !form.dateOfBirth) {
      setError(`A date of birth is required on a ${record.recordType} record.`)
      return
    }

    const patch = diff(subject, form, new Set(['dateOfBirth']))
    if (genderFrozen) delete patch.gender

    if (Object.keys(patch).length === 0) {
      setError('Nothing was changed.')
      return
    }

    setPending(true)
    const message = await onSave(patch)
    setPending(false)
    if (message) setError(message)
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <p className="eyebrow field--full">Edit subject</p>

      {error && (
        <p className="alert field--full" role="alert">
          {error}
        </p>
      )}

      <label className="field field--full">
        <span>Full name<b className="req">*</b></span>
        <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </label>

      <label className="field">
        <span>Gender<b className="req">*</b></span>
        <select
          value={form.gender}
          onChange={(e) => set('gender', e.target.value)}
          disabled={genderFrozen}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {genderFrozen && (
          <span className="form-hint">
            Frozen on a marriage — the roles are one groom and one bride, so swapping a gender
            collides with the other spouse. To correct a reversed entry, swap the two{' '}
            <strong>names</strong> instead.
          </span>
        )}
      </label>

      <label className="field">
        <span>Date of birth{needsBirthDate && <b className="req">*</b>}</span>
        <input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set('dateOfBirth', e.target.value)}
        />
      </label>

      <label className="field field--full">
        <span>Place of birth</span>
        <input value={form.placeOfBirth} onChange={(e) => set('placeOfBirth', e.target.value)} />
      </label>

      <label className="field">
        <span>Father</span>
        <input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
      </label>
      <label className="field">
        <span>Mother</span>
        <input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} />
      </label>

      <label className="field field--full">
        <span>Sponsors</span>
        <input value={form.sponsorNames} onChange={(e) => set('sponsorNames', e.target.value)} />
      </label>

      <div className="form-actions field--full">
        <p className="form-hint muted">Only changed fields are sent.</p>
        <div className="form-actions__buttons">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn--gold" disabled={pending}>
            {pending ? 'Saving…' : 'Save subject'}
          </button>
        </div>
      </div>
    </form>
  )
}
