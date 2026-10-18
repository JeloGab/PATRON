// A participant's checklist: verified or waived only. Clearing is server-side.

import { useCallback, useEffect, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'
import { RECORD_TYPE_LABEL } from '../lib/documents.js'
import { messageFor } from '../lib/errors.js'
import { REQUIREMENT_STATUS_LABEL, isSatisfied, requirementPill } from '../lib/roster.js'
import Loading from './Loading.jsx'
import Modal from './Modal.jsx'

export default function RequirementChecklist({
  participant,
  canDecide,
  onClose,
  onDecided,
  onSessionEnd,
}) {
  const [requirements, setRequirements] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [chosenRecordId, setChosenRecordId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const r = await authed({ path: `/api/participants/${participant.participantId}/requirements` })
    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      setRequirements([])
      return
    }
    setRequirements(r.json.requirements)
  }, [participant.participantId, onSessionEnd])

  useEffect(() => {
    load()
  }, [load])

  function openDecision(requirement) {
    setOpenId(requirement.requirementId === openId ? null : requirement.requirementId)
    setNotes(requirement.notes ?? '')
    setQuery(participant.participantName)
    setResults(null)
    setChosenRecordId('')
    setError('')
  }

  async function search(requirement) {
    setError('')
    setBusy('search')
    const r = await authed({
      path: `/api/records?q=${encodeURIComponent(query)}&type=${encodeURIComponent(requirement.autoCheckRecordType)}`,
    })
    setBusy('')
    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setResults(r.json.results)
  }

  async function decide(requirement, status) {
    setError('')
    setBusy(requirement.requirementId)

    const body = { status }
    if (notes.trim()) body.notes = notes.trim()
    if (chosenRecordId) body.recordId = chosenRecordId

    const r = await authed({
      method: 'PATCH',
      path: `/api/participants/${participant.participantId}/requirements/${requirement.requirementId}`,
      body,
    })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    setRequirements(r.json.requirements)
    setOpenId(null)
    setResults(null)
    setChosenRecordId('')
    onDecided()
  }

  return (
    <Modal open title={`Requirements — ${participant.participantName}`} onClose={onClose}>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {requirements === null ? (
        <Loading label="Loading the checklist…" />
      ) : requirements.length === 0 ? (
        <p className="empty">
          This event’s sacrament has no seeded requirements, so there is nothing to check.
        </p>
      ) : (
        <ul className="priest-list">
          {requirements.map((requirement) => (
            <li key={requirement.requirementId} className="priest-list__row priest-list__row--stack">
              <div>
                <strong>{requirement.requirementName}</strong>
                <p className="muted">
                  <span className={requirementPill(requirement.status)}>
                    {REQUIREMENT_STATUS_LABEL[requirement.status]}
                  </span>
                  {requirement.verifiedByName ? ` · ${requirement.verifiedByName}` : ''}
                  {requirement.verifiedAt
                    ? ` · ${formatLongDate(requirement.verifiedAt.slice(0, 10))}`
                    : ''}
                </p>
                {requirement.description && <p className="muted">{requirement.description}</p>}

                {requirement.matchedRecordId && (
                  <p className="notice">
                    Matched: {requirement.matchedSubjectNames} ·{' '}
                    {RECORD_TYPE_LABEL[requirement.matchedRecordType]} · book{' '}
                    {requirement.matchedBookNo}, page {requirement.matchedPageNo}, entry{' '}
                    {requirement.matchedEntryNo}
                  </p>
                )}
                {requirement.notes && <p className="muted">Note: {requirement.notes}</p>}
                {requirement.validityPeriodMonths && (
                  <p className="muted">
                    Valid for {requirement.validityPeriodMonths} months, measured to the event
                    date.
                  </p>
                )}
                {!requirement.autoCheckRecordType && requirement.status === 'pending' && (
                  <p className="muted">
                    Checked by hand — there is no register this can be matched against.
                  </p>
                )}
              </div>

              {canDecide && (
                <div className="form-actions__buttons">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => openDecision(requirement)}
                  >
                    {openId === requirement.requirementId
                      ? 'Close'
                      : isSatisfied(requirement)
                        ? 'Change'
                        : 'Decide'}
                  </button>
                </div>
              )}

              {canDecide && openId === requirement.requirementId && (
                <div className="form-grid field--full">
                  {requirement.autoCheckRecordType && (
                    <>
                      <p className="muted field--full">
                        Attach the {RECORD_TYPE_LABEL[requirement.autoCheckRecordType]?.toLowerCase()}{' '}
                        entry this requirement is satisfied by, or verify without one.
                      </p>
                      <label className="field">
                        <span>Search the register</span>
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={participant.participantName}
                        />
                      </label>
                      <div className="field">
                        <span>&nbsp;</span>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => search(requirement)}
                          disabled={busy === 'search'}
                        >
                          {busy === 'search' ? 'Searching…' : 'Search'}
                        </button>
                      </div>

                      {results !== null && (
                        <div className="field--full">
                          {results.length === 0 ? (
                            <p className="empty">No entry in that register matches.</p>
                          ) : (
                            <ul className="priest-list">
                              {results.map((row) => (
                                <li key={row.subjectId} className="priest-list__row">
                                  <div>
                                    <strong>{row.fullName}</strong>
                                    <p className="muted">
                                      Book {row.bookNo}, page {row.pageNo}, entry {row.entryNo}
                                      {row.dateOfBirth
                                        ? ` · born ${formatLongDate(row.dateOfBirth)}`
                                        : ''}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn--ghost"
                                    onClick={() => setChosenRecordId(row.recordId)}
                                  >
                                    {chosenRecordId === row.recordId ? 'Chosen' : 'Choose'}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <label className="field field--full">
                    <span>Note</span>
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Optional — what was seen, or why it is waived"
                    />
                  </label>

                  <div className="form-actions__buttons field--full">
                    <button
                      type="button"
                      className="btn btn--gold"
                      onClick={() => decide(requirement, 'verified')}
                      disabled={busy === requirement.requirementId}
                    >
                      {busy === requirement.requirementId ? 'Saving…' : 'Verified'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => decide(requirement, 'waived')}
                      disabled={busy === requirement.requirementId}
                    >
                      Waive
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="muted">
        Waiving records your name against the decision. Nothing is ever marked failed, and a
        participant is cleared automatically once no requirement is left pending.
      </p>
    </Modal>
  )
}
