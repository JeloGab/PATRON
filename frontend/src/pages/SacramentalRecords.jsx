import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import RecordAttachments from '../components/RecordAttachments.jsx'
import { RecordEditForm, SubjectEditForm } from '../components/RecordEditForms.jsx'
import RecordFormModal, { RECORD_TYPES } from '../components/RecordFormModal.jsx'
import { authed, isSessionError } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'
import { contentTypeFor } from '../lib/fileCheck.js'
import { messageFor } from '../lib/errors.js'
import { clearSession, getSession } from '../lib/session.js'

// The register, read from the API.
//
// Three things about the search that shape this page, all deliberate server-side:
//
//   it matches SUBJECT NAMES only — not registry numbers, officiants or encoders,
//   which the mock searched. Every word must appear, any order, case-insensitive
//   (plain ILIKE; trigram was cut 2026-09-11). At most five words are used.
//
//   a result row is a SUBJECT, not a record. A marriage whose groom and bride both
//   match appears twice, pointing at the same recordId. That is correct, not a bug:
//   you searched for a person and two people matched.
//
//   there is no total. 50 per page with `hasMore`, so there are no page numbers to
//   render — only "load more". Paging, sorting and a total are all additive later,
//   and `backlog.md` says to ask the frontend what it needs before building them.
const TYPE_LABEL = Object.fromEntries(RECORD_TYPES.map((t) => [t.value, t.label]))

const ROLE_LABEL = { primary: 'Subject', groom: 'Groom', bride: 'Bride' }

export default function SacramentalRecords() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const session = getSession()
  const canWrite = session?.role === 'manager'

  const [query, setQuery] = useState(params.get('search') || '')
  const [type, setType] = useState('')
  const [results, setResults] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // null | 'record' | a subjectId
  const [editing, setEditing] = useState(null)

  function endSession() {
    clearSession()
    navigate('/login', { replace: true })
  }

  function closeDetail() {
    setSelected(null)
    setDetailLoading(false)
    setEditing(null)
  }

  // Both PATCH routes answer with the WHOLE record, so the dialog refreshes from
  // the response rather than refetching. The table is refreshed too, because a
  // changed name or registry number changes what the search row shows.
  async function savePatch(path, patch, label) {
    const r = await authed({ method: 'PATCH', path, body: patch })
    if (isSessionError(r)) {
      endSession()
      return 'Session ended.'
    }
    if (!r.ok) return messageFor(r)

    setSelected(r.json.record)
    setEditing(null)
    await search(1)
    showNotice(label)
    return null
  }

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 6000)
  }

  const search = useCallback(
    async (nextPage = 1, { append = false } = {}) => {
      setLoading(true)
      setError('')

      const qs = new URLSearchParams()
      if (query.trim()) qs.set('q', query.trim())
      if (type) qs.set('type', type)
      qs.set('page', String(nextPage))

      const r = await authed({ path: `/api/records?${qs.toString()}` })
      setLoading(false)

      if (isSessionError(r)) {
        endSession()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        return
      }

      setResults((current) => (append ? [...current, ...r.json.results] : r.json.results))
      setPage(r.json.page)
      setHasMore(Boolean(r.json.hasMore))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, type],
  )

  // An empty search is legal and lists the register, so this runs on mount.
  useEffect(() => {
    search(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openRecord(recordId) {
    setDetailLoading(true)
    setError('')
    const r = await authed({ path: `/api/records/${recordId}` })
    setDetailLoading(false)

    if (isSessionError(r)) {
      endSession()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    setSelected(r.json.record)
  }

  // Encoding with a photo is TWO requests, by design — record_attachment.record_id is
  // NOT NULL with a foreign key, so a photo cannot exist before the record does.
  // records_summary.md §5.1: if the upload fails, the record stands, because an entry
  // is valid without a photo. The form has already checked size, type and the first
  // bytes, so this rarely happens — but when it does it is reported, not swallowed.
  async function handleCreate(payload, photo) {
    const r = await authed({ method: 'POST', path: '/api/records', body: payload })
    if (isSessionError(r)) {
      endSession()
      return 'Session ended.'
    }
    if (!r.ok) return messageFor(r)

    const record = r.json.record
    let photoProblem = null

    if (photo) {
      const up = await authed({
        method: 'POST',
        path: `/api/records/${record.recordId}/attachments`,
        raw: photo,
        headers: {
          'Content-Type': await contentTypeFor(photo),
          'X-File-Name': encodeURIComponent(photo.name),
        },
      })
      if (isSessionError(up)) {
        endSession()
        return 'Session ended.'
      }
      if (!up.ok) photoProblem = messageFor(up)
    }

    await search(1)
    const where = `${TYPE_LABEL[record.recordType]}, book ${record.bookNo}, page ${record.pageNo}, entry ${record.entryNo}`
    if (photoProblem) {
      // The entry exists. Say so plainly rather than reporting a failure, and name
      // the recovery: open it and drop the photo again.
      setError(`Entry saved (${where}), but the photo was not attached: ${photoProblem} Open the entry to try again.`)
    } else {
      showNotice(`Entry saved — ${where}${photo ? ', with its ledger photo' : ''}.`)
    }
    return null
  }

  function onSubmitSearch(event) {
    event.preventDefault()
    search(1)
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Sacramental records</p>
          <h1>Register</h1>
          <p className="lede">
            Search by the name of the person in the entry. Every word must appear, in any order —
            book, page and entry numbers are shown, not searched.
          </p>
        </div>
        <p className="stat">
          <strong>{results.length}</strong>
          {hasMore ? 'shown so far' : 'matching entries'}
        </p>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {canWrite && (
        <div className="page__actions">
          <button type="button" className="btn btn--gold" onClick={() => setCreateOpen(true)}>
            Encode entry
          </button>
        </div>
      )}

      <section className="panel">
        <form className="filters" onSubmit={onSubmitSearch}>
          <label className="field filters__search">
            <span>Subject name</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. cruz maria"
            />
          </label>
          <label className="field filters__type">
            <span>Register</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All registers</option>
              {RECORD_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {results.length === 0 ? (
          <p className="empty">
            {loading ? 'Searching the register…' : 'No entry matches that name.'}
          </p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name in entry</th>
                    <th>Role</th>
                    <th>Register</th>
                    <th>Book · Page · Entry</th>
                    <th>Date of sacrament</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr
                      key={row.subjectId}
                      className={selected?.recordId === row.recordId ? 'is-selected' : ''}
                    >
                      <td>{row.fullName}</td>
                      <td>{ROLE_LABEL[row.role] ?? row.role}</td>
                      <td>{TYPE_LABEL[row.recordType] ?? row.recordType}</td>
                      <td className="mono">
                        {row.bookNo} · {row.pageNo} · {row.entryNo}
                      </td>
                      <td>{row.recordDate ? formatLongDate(row.recordDate) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => openRecord(row.recordId)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => search(page + 1, { append: true })}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
            <p className="form-hint muted">
              50 entries per page. The server returns no total, so there are no page numbers — only
              more.
            </p>
          </>
        )}
      </section>

      {/* Opened as a dialog rather than a panel below the table. The table can be
          50 rows long, so a panel underneath put the entry you just opened off
          screen. Modal brings its own close button, Escape handling and overlay
          click, so the panel head no longer needs one.

          It opens on the click, before the fetch resolves, so there is immediate
          feedback instead of a silent pause. */}
      <Modal
        title={
          selected
            ? `${TYPE_LABEL[selected.recordType] ?? selected.recordType} · book ${selected.bookNo}, page ${selected.pageNo}, entry ${selected.entryNo}`
            : 'Register entry'
        }
        open={Boolean(selected) || detailLoading}
        onClose={closeDetail}
      >
        {!selected ? (
          <p className="empty">Opening the entry…</p>
        ) : (
          <div className="stack">
            <p className="muted">
              {selected.recordDate ? formatLongDate(selected.recordDate) : '—'} ·{' '}
              {selected.officiantName}
            </p>

            {editing === 'record' ? (
              <RecordEditForm
                record={selected}
                onCancel={() => setEditing(null)}
                onSave={(patch) =>
                  savePatch(`/api/records/${selected.recordId}`, patch, 'Entry updated.')
                }
              />
            ) : (
              canWrite && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setEditing('record')}
                >
                  Edit entry
                </button>
              )
            )}

          <dl className="facts">
            <div>
              <dt>Register</dt>
              <dd>{TYPE_LABEL[selected.recordType] ?? selected.recordType}</dd>
            </div>
            {selected.dateOfDeath && (
              <div>
                <dt>Date of death</dt>
                <dd>{formatLongDate(selected.dateOfDeath)}</dd>
              </div>
            )}
            <div>
              <dt>Encoded by</dt>
              <dd>{selected.createdByName ?? '—'}</dd>
            </div>
            <div>
              <dt>Document requests</dt>
              <dd>{selected.requestCount}</dd>
            </div>
            <div>
              <dt>Certificates issued</dt>
              <dd>{selected.issuedCount}</dd>
            </div>
          </dl>

          <h3 className="eyebrow">
            {selected.subjects.length === 2 ? 'Groom and bride' : 'Subject'}
          </h3>
          <ul className="priest-list">
            {selected.subjects.map((subject) =>
              editing === subject.subjectId ? (
                <li key={subject.subjectId}>
                  <SubjectEditForm
                    record={selected}
                    subject={subject}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) =>
                      savePatch(
                        `/api/records/${selected.recordId}/subjects/${subject.subjectId}`,
                        patch,
                        'Subject updated.',
                      )
                    }
                  />
                </li>
              ) : (
              <li key={subject.subjectId} className="priest-list__row">
                <div>
                  <strong>{subject.fullName}</strong>
                  <p className="muted">
                    {ROLE_LABEL[subject.role] ?? subject.role} · {subject.gender}
                    {subject.dateOfBirth ? ` · born ${formatLongDate(subject.dateOfBirth)}` : ''}
                    {subject.placeOfBirth ? ` · ${subject.placeOfBirth}` : ''}
                  </p>
                  {(subject.fatherName || subject.motherName) && (
                    <p className="muted">
                      Parents: {subject.fatherName || '—'} and {subject.motherName || '—'}
                    </p>
                  )}
                  {subject.sponsorNames && <p className="muted">Sponsors: {subject.sponsorNames}</p>}
                </div>
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setEditing(subject.subjectId)}
                  >
                    Edit
                  </button>
                )}
              </li>
              ),
            )}
          </ul>

          <RecordAttachments
            record={selected}
            canWrite={canWrite}
            onRecordChange={setSelected}
            onSessionEnd={endSession}
          />

          <p className="form-hint muted">
            Nothing is ever deleted from a register, and the register type can never be changed.
            Counts are computed at read time, never stored.
          </p>
          </div>
        )}
      </Modal>

      <RecordFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
