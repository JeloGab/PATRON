// Path 2: one register entry and one certificate per cleared participant.

import { useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'
import { messageFor } from '../lib/errors.js'
import { PARTICIPANT_STATUS_LABEL, participantPill } from '../lib/roster.js'
import { SACRAMENT_LABEL } from '../lib/schedule.js'
import Modal from './Modal.jsx'

const REGISTER_FOR = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  funeral: 'death',
}

function emptyDetail() {
  return { fatherName: '', motherName: '', placeOfBirth: '', dateOfDeath: '' }
}

export default function CompleteEventModal({ event, participants, onClose, onDone, onSessionEnd }) {
  const sacramental = event.eventType === 'sacramental'
  const register = REGISTER_FOR[event.sacramentType]
  const cleared = participants.filter((person) => person.status === 'cleared')
  const skipped = participants.filter((person) => person.status === 'pending')

  const [registry, setRegistry] = useState({ bookNo: '', pageNo: '' })
  const [details, setDetails] = useState(() =>
    Object.fromEntries(cleared.map((person) => [person.participantId, emptyDetail()])),
  )
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function updateDetail(participantId, field) {
    return (changed) =>
      setDetails((current) => ({
        ...current,
        [participantId]: { ...current[participantId], [field]: changed.target.value },
      }))
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault()
    setError('')

    if (sacramental && (!registry.bookNo.trim() || !registry.pageNo.trim())) {
      setError('Enter the book and page this ceremony is written on.')
      return
    }

    const body = {}
    if (sacramental) {
      body.bookNo = registry.bookNo.trim()
      body.pageNo = registry.pageNo.trim()

      body.participants = cleared.map((person) => {
        const detail = details[person.participantId] ?? emptyDetail()
        const entry = { participantId: person.participantId }
        if (detail.fatherName.trim()) entry.fatherName = detail.fatherName.trim()
        if (detail.motherName.trim()) entry.motherName = detail.motherName.trim()
        if (detail.placeOfBirth.trim()) entry.placeOfBirth = detail.placeOfBirth.trim()
        if (register === 'death' && detail.dateOfDeath) entry.dateOfDeath = detail.dateOfDeath
        return entry
      })
    }

    setPending(true)
    const r = await authed({
      method: 'POST',
      path: `/api/events/${event.eventId}/complete`,
      body,
    })
    setPending(false)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setResult(r.json)
    onDone(r.json.event)
  }

  if (result) {
    return (
      <Modal open title="Event completed" onClose={onClose}>
        <p className="notice">
          {result.generated.records === 0
            ? 'The event is completed. No register entry was generated.'
            : `${result.generated.records} register ${result.generated.records === 1 ? 'entry' : 'entries'} written and ${result.generated.certificates} ${result.generated.certificates === 1 ? 'certificate' : 'certificates'} issued.`}
        </p>

        {result.warnings.length > 0 && (
          <>
            <h3 className="eyebrow">Not recorded</h3>
            <ul className="day-detail__list">
              {result.warnings.map((warning) => (
                <li key={warning}>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
            <p className="muted">
              These cannot be recovered through the roster — the event is completed, so its
              checklists are closed. A rite that happened can still be hand-encoded in
              Sacramental records, and a certificate requested against it.
            </p>
          </>
        )}

        <div className="form-actions__buttons">
          <button type="button" className="btn btn--gold" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open title={`Complete — ${event.title}`} onClose={onClose}>
      <p className="muted">
        {formatLongDate(event.eventDate)} ·{' '}
        {sacramental ? SACRAMENT_LABEL[event.sacramentType] : 'General event'}
      </p>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <p className="notice">
        Completing is final. The register entries and certificates are written in the same step,
        and nothing about this event or its roster can change afterwards.
      </p>

      {skipped.length > 0 && (
        <>
          <h3 className="eyebrow">{skipped.length} will be skipped</h3>
          <ul className="day-detail__list">
            {skipped.map((person) => (
              <li key={person.participantId}>
                <strong>{person.participantName}</strong>
                <span>
                  <span className={participantPill(person.status)}>
                    {PARTICIPANT_STATUS_LABEL[person.status]}
                  </span>{' '}
                  — nothing will be recorded for them
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">
            Close this, open their checklist and verify or waive what is outstanding — that is the
            intended path, and it records who waived it. After completion there is no way back.
          </p>
        </>
      )}

      {cleared.length === 0 ? (
        <p className="empty">
          No participant is cleared, so completing this event would write nothing to the register.
        </p>
      ) : (
        <form onSubmit={submit}>
          {sacramental && (
            <>
              <h3 className="eyebrow">Register</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Book *</span>
                  <input
                    value={registry.bookNo}
                    onChange={(changed) =>
                      setRegistry((current) => ({ ...current, bookNo: changed.target.value }))
                    }
                    placeholder="XII"
                  />
                </label>
                <label className="field">
                  <span>Page *</span>
                  <input
                    value={registry.pageNo}
                    onChange={(changed) =>
                      setRegistry((current) => ({ ...current, pageNo: changed.target.value }))
                    }
                    placeholder="48"
                  />
                </label>
              </div>
              <p className="muted">
                Typed once for the whole ceremony. Each entry number is assigned by the system as
                the next number in this register.
              </p>

              <h3 className="eyebrow">
                {cleared.length} cleared participant{cleared.length === 1 ? '' : 's'}
              </h3>
              {cleared.map((person) => (
                <div key={person.participantId} className="subject-group">
                  <p className="eyebrow">{person.participantName}</p>
                  <div className="form-grid">
                    <label className="field">
                      <span>Father’s name</span>
                      <input
                        value={details[person.participantId]?.fatherName ?? ''}
                        onChange={updateDetail(person.participantId, 'fatherName')}
                      />
                    </label>
                    <label className="field">
                      <span>Mother’s name</span>
                      <input
                        value={details[person.participantId]?.motherName ?? ''}
                        onChange={updateDetail(person.participantId, 'motherName')}
                      />
                    </label>
                    <label className="field">
                      <span>Place of birth</span>
                      <input
                        value={details[person.participantId]?.placeOfBirth ?? ''}
                        onChange={updateDetail(person.participantId, 'placeOfBirth')}
                      />
                    </label>
                    {register === 'death' && (
                      <label className="field">
                        <span>Date of death</span>
                        <input
                          type="date"
                          value={details[person.participantId]?.dateOfDeath ?? ''}
                          onChange={updateDetail(person.participantId, 'dateOfDeath')}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="form-actions">
            <p className="muted form-hint">
              {register === 'marriage'
                ? 'A marriage is one entry with two subjects, so exactly two cleared participants of different genders are needed.'
                : 'One register entry per cleared participant, each with its own certificate.'}
            </p>
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Not yet
              </button>
              <button type="submit" className="btn btn--gold" disabled={pending}>
                {pending ? 'Writing the register…' : 'Complete and issue'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
