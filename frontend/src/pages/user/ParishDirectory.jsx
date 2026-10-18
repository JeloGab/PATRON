// The public directory: five columns, active parishes only.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChurchMedia from '../../components/ChurchMedia.jsx'
import Loading from '../../components/Loading.jsx'
import { call } from '../../lib/api.js'
import { messageFor } from '../../lib/errors.js'
import { accentFor, municipalityFromAddress } from '../../lib/parishes.js'

export default function ParishDirectory() {
  const [parishes, setParishes] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true

    async function load() {
      const r = await call({ path: '/api/parishes' })
      if (!live) return
      if (!r.ok) {
        setError(messageFor(r))
        setParishes([])
        return
      }
      setParishes(r.json.parishes)
    }

    load()
    return () => {
      live = false
    }
  }, [])

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return parishes ?? []
    return (parishes ?? []).filter((parish) =>
      `${parish.name} ${parish.address}`.toLowerCase().includes(needle),
    )
  }, [parishes, query])

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Find a parish</h1>
          <p className="lede">
            Parishes registered in PATRON. Open a listing for its address and office contacts, or
            request a certificate from it directly.
          </p>
        </div>
        <p className="stat">
          <strong>{parishes ? parishes.length : '—'}</strong>
          {parishes?.length === 1 ? 'parish listed' : 'parishes listed'}
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search parishes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by parish name or address…"
          />
        </label>
      </div>

      {parishes === null ? (
        <Loading label="Loading parishes…" />
      ) : list.length === 0 ? (
        <p className="empty">
          {parishes.length === 0
            ? 'No parish has been registered yet. A diocesan administrator registers parishes before they appear here.'
            : 'No parish matches that search.'}
        </p>
      ) : (
        <ul className="grid">
          {list.map((parish) => {
            const municipality = municipalityFromAddress(parish.address)
            return (
              <li key={parish.parishId} className="parish-card">
                <Link to={`/user/parish/${parish.parishId}`} className="parish-card__link">
                  <ChurchMedia
                    id={parish.parishId}
                    accent={accentFor(parish.parishId)}
                    className="parish-card__media"
                    name={parish.name}
                    alt={parish.name}
                  >
                    {municipality && (
                      <span className="chip" style={{ background: accentFor(parish.parishId) }}>
                        {municipality}
                      </span>
                    )}
                  </ChurchMedia>
                  <div className="parish-card__body">
                    <h2>{parish.name}</h2>
                    <p className="muted">{parish.address}</p>
                    <p className="parish-card__summary">
                      {parish.contactNo ? `Office: ${parish.contactNo}` : 'No contact number listed'}
                      {parish.email ? ` · ${parish.email}` : ''}
                    </p>
                  </div>
                </Link>
                <div className="parish-card__actions">
                  <Link
                    to={`/user/parish/${parish.parishId}/request`}
                    className="btn btn--gold btn--block"
                  >
                    Request document
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
