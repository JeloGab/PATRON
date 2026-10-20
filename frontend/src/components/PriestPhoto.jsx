// A priest's public photograph, or his initial when he has none.

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
