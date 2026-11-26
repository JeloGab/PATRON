// A parish photograph from GET /api/parishes/:id/photo, or a crest when there is none.

import { useState } from 'react'
import { BASE } from '../lib/api.js'

function crestLetter(name) {
  const letter = String(name ?? '').trim().slice(0, 1).toUpperCase()
  return letter || '✝'
}

export default function ChurchMedia({ id, accent, className = '', children, alt = '', name, version }) {
  const [failedKey, setFailedKey] = useState(null)
  const key = `${id ?? ''}:${version ?? ''}`
  const query = version ? `?v=${encodeURIComponent(version)}` : ''
  const src = id && failedKey !== key ? `${BASE}/api/parishes/${id}/photo${query}` : null

  return (
    <div className={`${className} ${src ? 'has-photo' : ''}`.trim()} style={{ '--accent': accent }}>
      {src ? (
        <img className="church-media__img" src={src} alt={alt} onError={() => setFailedKey(key)} />
      ) : (
        <span className="church-media__crest" aria-hidden="true">
          {crestLetter(name ?? alt)}
        </span>
      )}
      {children}
    </div>
  )
}
