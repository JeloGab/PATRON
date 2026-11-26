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

export default function PriestPhoto({
  parishId,
  userId,
  name,
  hasPhoto = false,
  variant = 'row',
  version,
}) {
  const [failedKey, setFailedKey] = useState(null)
  const key = `${parishId ?? ''}:${userId ?? ''}:${version ?? ''}`
  const show = hasPhoto && parishId && userId && failedKey !== key
  const band = variant === 'band'

  if (!show) {
    return (
      <span
        className={band ? 'cleric__frame' : 'clergy__photo clergy__photo--empty'}
        aria-hidden="true"
      >
        {initial(name)}
      </span>
    )
  }

  const query = version ? `?v=${encodeURIComponent(version)}` : ''
  const src = `${BASE}/api/parishes/${encodeURIComponent(parishId)}/priests/${encodeURIComponent(
    userId
  )}/photo${query}`

  return (
    <img
      className={band ? 'cleric__frame cleric__frame--photo' : 'clergy__photo'}
      src={src}
      alt={name ?? ''}
      loading="lazy"
      onError={() => setFailedKey(key)}
    />
  )
}
