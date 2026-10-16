// A priest's photograph from GET /api/parishes/:parishId/priests/:userId/photo, or his
// initial when he has none — or when that route does not exist yet.
//
// Three ways this falls back to the letter, all of them normal: the parish read said
// hasPhoto is false, the route is not deployed, or the photo was cleared between that
// read and this request. onError covers the last two, so the circle is never empty.

import { useState } from 'react'
import { BASE } from '../lib/api.js'

function initial(name) {
  const letter = String(name ?? '')
    .trim()
    .slice(0, 1)
    .toUpperCase()
  return letter || '✝'
}

export default function PriestPhoto({ parishId, userId, name, hasPhoto = false }) {
  const [failed, setFailed] = useState(false)
  const show = hasPhoto && parishId && userId && !failed

  if (!show) {
    return (
      <span className="clergy__photo clergy__photo--empty" aria-hidden="true">
        {initial(name)}
      </span>
    )
  }

  const src = `${BASE}/api/parishes/${encodeURIComponent(parishId)}/priests/${encodeURIComponent(
    userId
  )}/photo`

  return (
    <img
      className="clergy__photo"
      src={src}
      alt={name ?? ''}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
