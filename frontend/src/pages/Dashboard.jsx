import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { churches } from '../data/mock.js'

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('all')

  const cities = useMemo(
    () => ['all', ...Array.from(new Set(churches.map((c) => c.city)))],
    [],
  )

  const list = churches.filter((church) => {
    const hay = `${church.name} ${church.city} ${church.diocese} ${church.patron}`.toLowerCase()
    const matchesQuery = hay.includes(query.trim().toLowerCase())
    const matchesCity = city === 'all' || church.city === city
    return matchesQuery && matchesCity
  })

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Find a parish</h1>
          <p className="lede">
            Browse participating Catholic churches. Open a listing to see clergy, sacraments, and
            Mass times.
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
            placeholder="Search by name, city, diocese, or patron…"
          />
        </label>
        <label className="select">
          <span className="sr-only">Filter by city</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All cities' : item}
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
            <li key={church.id}>
              <Link to={`/parish/${church.id}`} className="parish-card">
                <div className="parish-card__media" style={{ '--accent': church.accent }}>
                  <span className="chip" style={{ background: church.accent }}>
                    Est. {church.founded}
                  </span>
                </div>
                <div className="parish-card__body">
                  <p className="parish-card__diocese">{church.diocese}</p>
                  <h2>{church.name}</h2>
                  <p className="muted">{church.city}</p>
                  <p className="parish-card__summary">{church.summary}</p>
                  <span className="linkish">View parish details</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
