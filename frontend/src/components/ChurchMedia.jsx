// A parish photograph from GET /api/parishes/:id/photo, or an accent crest when the
// parish has none — or when that route does not exist yet.

import { useState } from 'react'
import { BASE } from '../lib/api.js'

function crestLetter(name) {
  const letter = String(name ?? '').trim().slice(0, 1).toUpperCase()
  return letter || '✝'
}

export default function ChurchMedia({ id, accent, className = '', children, alt = '', name, version }) {
  const [failed, setFailed] = useState(false)
  const query = version ? `?v=${encodeURIComponent(version)}` : ''
  const src = id && !failed ? `${BASE}/api/parishes/${id}/photo${query}` : null

  return (
    <div className={`${className} ${src ? 'has-photo' : ''}`.trim()} style={{ '--accent': accent }}>
      {src ? (
        <img className="church-media__img" src={src} alt={alt} onError={() => setFailed(true)} />
      ) : (
        <span className="church-media__crest" aria-hidden="true">
          {crestLetter(name ?? alt)}
        </span>
      )}
      {children}
    </div>
  )
}
