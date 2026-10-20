// Another staff member's photograph, for the lists a priest or manager sees.

import { useEffect, useState } from 'react'
import { authed } from '../lib/api.js'

function initial(name) {
  const letter = String(name ?? '')
    .trim()
    .slice(0, 1)
    .toUpperCase()
  return letter || '✝'
}

export default function StaffPhoto({ userId, name, hasPhoto = false, className = '' }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let live = true
    let created = null

    if (!hasPhoto || !userId) {
      setUrl(null)
      return undefined
    }

    async function load() {
      const r = await authed({
        path: `/api/auth/photo/${encodeURIComponent(userId)}`,
        as: 'blob',
      })
      if (!live || !r.ok) return
      created = URL.createObjectURL(r.blob)
      setUrl(created)
    }

    load()
    return () => {
      live = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [userId, hasPhoto])

  if (!url) {
    return (
      <span className={`staff-photo staff-photo--empty ${className}`.trim()} aria-hidden="true">
        {initial(name)}
      </span>
    )
  }

  return <img className={`staff-photo ${className}`.trim()} src={url} alt={name ?? ''} />
}
