import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOffice } from '../context/OfficeContext.jsx'
import { MANAGER_NAME, PRIESTS, SACRAMENTS } from '../data/mock.js'
import { formatLongDate } from '../lib/dates.js'
import { getSession } from '../lib/session.js'

export default function SacramentalRecords() {
  const { records, updateRecord } = useOffice()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('search') || '')
  const [sacrament, setSacrament] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const session = getSession()
  const encoder = session?.email || MANAGER_NAME

  const rows = useMemo(() => {
    return records.filter((item) => {
      if (sacrament !== 'all' && item.sacrament !== sacrament) return false
      if (!query.trim()) return true
      const hay =
        `${item.id} ${item.sacrament} ${item.subjects} ${item.officiant} ${item.encodedBy}`.toLowerCase()
      return hay.includes(query.trim().toLowerCase())
    })
  }, [records, query, sacrament])

  function startEdit(item) {
    setEditingId(item.id)
    setError('')
    setDraft({
      id: item.id,
      sacrament: item.sacrament,
      subjects: item.subjects,
      date: item.date,
      officiant: item.officiant,
      encodedBy: item.encodedBy,
    })
  }

  function save(event) {
    event.preventDefault()
    if (!draft.id.trim() || !draft.subjects.trim() || !draft.date || !draft.officiant || !draft.encodedBy.trim()) {
      setError('Complete every field before saving.')
      return
    }
    updateRecord(editingId, {
      id: draft.id.trim(),
      sacrament: draft.sacrament,
      subjects: draft.subjects.trim(),
      date: draft.date,
      officiant: draft.officiant,
      encodedBy: draft.encodedBy.trim() || encoder,
    })
    setEditingId(draft.id.trim())
    setError('')
  }

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Sacramental records</p>
          <h1>Records</h1>
          <p className="lede">
            Search the register, filter by sacrament, and edit a record from its row.
          </p>
        </div>
        <p className="stat">
          <strong>{rows.length}</strong>
          records
        </p>
      </header>

      <section className="panel">
        <div className="filters">
          <label className="field filters__search">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search registry no., subject, officiant, or encoded by"
            />
          </label>
          <label className="field filters__type">
            <span>Sacrament</span>
            <select value={sacrament} onChange={(event) => setSacrament(event.target.value)}>
              <option value="all">All sacraments</option>
              {SACRAMENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="empty">No records match that search.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Registry no.</th>
                  <th>Sacrament</th>
                  <th>Subject(s)</th>
                  <th>Date of sacrament</th>
                  <th>Officiant</th>
                  <th>Encoded by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className={editingId === item.id ? 'is-selected' : ''}>
                    <td>{item.id}</td>
                    <td>{item.sacrament}</td>
                    <td>{item.subjects}</td>
                    <td>{formatLongDate(item.date)}</td>
                    <td>{item.officiant}</td>
                    <td>{item.encodedBy}</td>
                    <td>
                      <button type="button" className="btn btn--ghost" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {draft && (
        <form className="card editor" onSubmit={save}>
          <p className="eyebrow">Edit record</p>
          <h2>{draft.subjects || 'Record'}</h2>
          {error && <p className="alert">{error}</p>}
          <div className="form-grid">
            <label className="field">
              <span>Registry no.</span>
              <input
                value={draft.id}
                onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Sacrament</span>
              <select
                value={draft.sacrament}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sacrament: event.target.value }))
                }
              >
                {SACRAMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Subject(s)</span>
              <input
                value={draft.subjects}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, subjects: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Date of sacrament</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Officiant</span>
              <select
                value={draft.officiant}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, officiant: event.target.value }))
                }
              >
                {PRIESTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Encoded by</span>
              <input
                value={draft.encodedBy}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, encodedBy: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setEditingId(null)
                setDraft(null)
                setError('')
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--gold">
              Save changes
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
