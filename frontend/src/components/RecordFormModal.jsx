import { useState } from 'react'
import { checkPhoto } from '../lib/fileCheck.js'
import Modal from './Modal.jsx'
import PhotoDrop from './PhotoDrop.jsx'

// Encoding a register entry. There was no create path in the frontend at all — the
// old page could only edit — so this is written against the schema rather than
// adapted from the mock.
//
// The four types are the parish REGISTERS, not the sacraments. The mock offered seven
// options including First Communion, Confession and Anointing of the Sick, none of
// which a parish registers and none of which the database will accept.
export const RECORD_TYPES = [
  { value: 'baptism', label: 'Baptism' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'death', label: 'Death' },
]

// Two rules the schema enforces, mirrored here so the form cannot submit something
// Postgres will refuse:
//
//   a marriage is EXACTLY two subjects, one male and one female
//     check (role = 'primary' or (role='groom' and gender='male')
//                             or (role='bride' and gender='female'))
//     unique (record_id, role)   -- so a second groom is impossible
//
//   a date of birth is required for baptism and confirmation ONLY
//     — the same two types Path 2 builds records from
//
// `role` is never sent. The server derives it from `gender`.
const BIRTH_DATE_REQUIRED = new Set(['baptism', 'confirmation'])

function emptySubject() {
  return {
    fullName: '',
    gender: 'male',
    dateOfBirth: '',
    placeOfBirth: '',
    fatherName: '',
    motherName: '',
    sponsorNames: '',
  }
}

export default function RecordFormModal({ open, onClose, onCreate }) {
  const [recordType, setRecordType] = useState('baptism')
  const [bookNo, setBookNo] = useState('')
  const [pageNo, setPageNo] = useState('')
  const [entryNo, setEntryNo] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [dateOfDeath, setDateOfDeath] = useState('')
  const [officiantName, setOfficiantName] = useState('')
  const [subjects, setSubjects] = useState([emptySubject()])
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const isMarriage = recordType === 'marriage'
  const needsBirthDate = BIRTH_DATE_REQUIRED.has(recordType)

  function reset() {
    setRecordType('baptism')
    setBookNo('')
    setPageNo('')
    setEntryNo('')
    setRecordDate('')
    setDateOfDeath('')
    setOfficiantName('')
    setSubjects([emptySubject()])
    setPhoto(null)
    setError('')
    setPending(false)
  }

  // Checked here, before anything is created. records_summary.md §5.1 step 1: a bad
  // file never causes a record to exist. Size, declared type and the first twelve
  // bytes, so a .txt renamed to .jpg is caught before the POST.
  async function takePhoto(files) {
    const file = files[0]
    const message = await checkPhoto(file)
    if (message) {
      setError(message)
      setPhoto(null)
      return
    }
    setError('')
    setPhoto(file)
  }

  function close() {
    reset()
    onClose()
  }

  // Changing the type changes how many subjects are legal, so the rows follow it.
  // A marriage gets a second row pre-set to female, because one of each is the only
  // shape the unique index permits.
  function changeType(next) {
    setRecordType(next)
    setError('')
    if (next === 'marriage') {
      setSubjects((rows) =>
        rows.length === 2 ? rows : [{ ...(rows[0] ?? emptySubject()), gender: 'male' }, { ...emptySubject(), gender: 'female' }],
      )
    } else {
      setSubjects((rows) => [rows[0] ?? emptySubject()])
      setDateOfDeath('')
    }
  }

  function updateSubject(index, patch) {
    setSubjects((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!bookNo.trim() || !pageNo.trim() || !entryNo.trim()) {
      setError('Book, page and entry numbers are all required.')
      return
    }
    if (!recordDate) {
      setError('The date of the sacrament is required.')
      return
    }
    if (!officiantName.trim()) {
      setError("The officiant's name is required.")
      return
    }
    if (subjects.some((row) => !row.fullName.trim())) {
      setError('Every subject needs a full name.')
      return
    }
    if (needsBirthDate && subjects.some((row) => !row.dateOfBirth)) {
      setError(`A date of birth is required for a ${recordType} record.`)
      return
    }
    if (isMarriage) {
      if (subjects.length !== 2) {
        setError('A marriage needs exactly two subjects.')
        return
      }
      const genders = new Set(subjects.map((row) => row.gender))
      if (genders.size !== 2) {
        setError('A marriage needs one male and one female subject.')
        return
      }
    }

    // Only non-empty optional fields are sent. An empty string is not the same as
    // absent for a `date` column, and the server would read '' as an invalid date.
    const payload = {
      recordType,
      bookNo: bookNo.trim(),
      pageNo: pageNo.trim(),
      entryNo: entryNo.trim(),
      recordDate,
      officiantName: officiantName.trim(),
      subjects: subjects.map((row) => {
        const subject = { fullName: row.fullName.trim(), gender: row.gender }
        if (row.dateOfBirth) subject.dateOfBirth = row.dateOfBirth
        if (row.placeOfBirth.trim()) subject.placeOfBirth = row.placeOfBirth.trim()
        if (row.fatherName.trim()) subject.fatherName = row.fatherName.trim()
        if (row.motherName.trim()) subject.motherName = row.motherName.trim()
        if (row.sponsorNames.trim()) subject.sponsorNames = row.sponsorNames.trim()
        return subject
      }),
    }
    if (recordType === 'death' && dateOfDeath) payload.dateOfDeath = dateOfDeath

    setPending(true)
    const message = await onCreate(payload, photo)
    setPending(false)

    if (message) {
      setError(message)
      return
    }
    close()
  }

  return (
    <Modal title="Encode register entry" open={open} onClose={close}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted field--full">
          The register, not the sacrament — baptism, confirmation, marriage and death are the four
          books a parish keeps. The type cannot be changed after saving.
        </p>

        {error && (
          <p className="alert field--full" role="alert">
            {error}
          </p>
        )}

        <label className="field">
          <span>Register</span>
          <select value={recordType} onChange={(e) => changeType(e.target.value)}>
            {RECORD_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Date of sacrament</span>
          <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
        </label>

        <label className="field">
          <span>Book no.</span>
          <input value={bookNo} onChange={(e) => setBookNo(e.target.value)} placeholder="XII" />
        </label>
        <label className="field">
          <span>Page no.</span>
          <input value={pageNo} onChange={(e) => setPageNo(e.target.value)} placeholder="48" />
        </label>
        <label className="field">
          <span>Entry no.</span>
          <input value={entryNo} onChange={(e) => setEntryNo(e.target.value)} placeholder="12" />
        </label>

        <label className="field field--full">
          <span>Officiant</span>
          <input
            value={officiantName}
            onChange={(e) => setOfficiantName(e.target.value)}
            placeholder="Rev. Fr. Juan dela Cruz"
          />
          <span className="form-hint">
            Free text, not a list of current priests — old ledgers name priests who were never in
            the system.
          </span>
        </label>

        {recordType === 'death' && (
          <label className="field field--full">
            <span>Date of death (optional)</span>
            <input
              type="date"
              value={dateOfDeath}
              onChange={(e) => setDateOfDeath(e.target.value)}
            />
          </label>
        )}

        {subjects.map((row, index) => (
          <fieldset className="field--full subject-group" key={index}>
            <legend className="eyebrow">
              {isMarriage ? (row.gender === 'male' ? 'Groom' : 'Bride') : 'Subject'}
            </legend>
            <div className="form-grid">
              <label className="field field--full">
                <span>Full name</span>
                <input
                  value={row.fullName}
                  onChange={(e) => updateSubject(index, { fullName: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Gender</span>
                <select
                  value={row.gender}
                  onChange={(e) => updateSubject(index, { gender: e.target.value })}
                  // A marriage's two roles are fixed by gender and the unique index
                  // allows only one of each, so flipping one here would collide.
                  disabled={isMarriage}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {isMarriage && (
                  <span className="form-hint">Fixed — a marriage is one groom and one bride.</span>
                )}
              </label>

              <label className="field">
                <span>Date of birth{needsBirthDate ? '' : ' (optional)'}</span>
                <input
                  type="date"
                  value={row.dateOfBirth}
                  onChange={(e) => updateSubject(index, { dateOfBirth: e.target.value })}
                />
              </label>

              <label className="field field--full">
                <span>Place of birth (optional)</span>
                <input
                  value={row.placeOfBirth}
                  onChange={(e) => updateSubject(index, { placeOfBirth: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Father (optional)</span>
                <input
                  value={row.fatherName}
                  onChange={(e) => updateSubject(index, { fatherName: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Mother (optional)</span>
                <input
                  value={row.motherName}
                  onChange={(e) => updateSubject(index, { motherName: e.target.value })}
                />
              </label>

              <label className="field field--full">
                <span>Sponsors (optional)</span>
                <input
                  value={row.sponsorNames}
                  onChange={(e) => updateSubject(index, { sponsorNames: e.target.value })}
                  placeholder="One line, as written in the ledger"
                />
              </label>
            </div>
          </fieldset>
        ))}

        <div className="field--full subject-group">
          <p className="eyebrow">Ledger photo (optional)</p>
          {photo ? (
            <p className="notice">
              {photo.name} · {Math.max(1, Math.round(photo.size / 1024))} KB{' '}
              <button type="button" className="text-btn" onClick={() => setPhoto(null)}>
                remove
              </button>
            </p>
          ) : (
            <PhotoDrop
              onFiles={takePhoto}
              disabled={pending}
              hint="JPEG, PNG, WebP or PDF, up to 5 MB. Uploaded straight after the entry is saved — two requests, so the entry still stands if the photo fails."
            />
          )}
        </div>

        <div className="form-actions field--full">
          <p className="form-hint muted">
            Nothing is ever deleted from a register, and the type can never be changed — check both
            before saving.
          </p>
          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={close} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold" disabled={pending}>
              {pending ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
