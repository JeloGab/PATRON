import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChurchMedia from '../components/ChurchMedia.jsx'
import { churches } from '../data/mock.js'

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [diocese, setDiocese] = useState('all')

  const dioceses = useMemo(
    () => ['all', ...Array.from(new Set(churches.map((c) => c.diocese)))],
    [],
  )

  const list = churches.filter((church) => {
    const hay =
      `${church.name} ${church.city} ${church.diocese} ${church.vicariate} ${church.patron}`.toLowerCase()
    const matchesQuery = hay.includes(query.trim().toLowerCase())
    const matchesDiocese = diocese === 'all' || church.diocese === diocese
    return matchesQuery && matchesDiocese
  })

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Find a parish</h1>
          <p className="lede">
            Browse parishes under the Archdiocese of Caceres and the Diocese of Libmanan. Open a
            listing for clergy, sacraments, and Mass times.
          </p>
        </div>
        <p className="stat">
          <strong>{churches.length}</strong>
          parishes listed
        </p>
      </header>

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search parishes</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, diocese, vicariate, or patron…"
          />
        </label>
        <label className="select">
          <span className="sr-only">Filter by diocese</span>
          <select value={diocese} onChange={(e) => setDiocese(e.target.value)}>
            {dioceses.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All dioceses' : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <p className="empty">No parish matches that search.</p>
      ) : (
        <ul className="grid">
          {list.map((church) => (
            <li key={church.id} className="parish-card">
              <Link to={`/parish/${church.id}`} className="parish-card__link">
                <ChurchMedia
                  id={church.id}
                  accent={church.accent}
                  className="parish-card__media"
                  alt={church.name}
                >
                  <span className="chip" style={{ background: church.accent }}>
                    Est. {String(church.founded).replace(/^.*(\d{4}).*$/, '$1') || church.founded}
                  </span>
                </ChurchMedia>
                <div className="parish-card__body">
                  <p className="parish-card__diocese">{church.diocese}</p>
                  <h2>{church.name}</h2>
                  <p className="muted">
                    {church.vicariate} · {church.city}
                  </p>
                  <p className="parish-card__summary">{church.summary}</p>
                </div>
              </Link>
              <div className="parish-card__actions">
                <Link to={`/parish/${church.id}/request`} className="btn btn--gold btn--block">
                  Request document
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
