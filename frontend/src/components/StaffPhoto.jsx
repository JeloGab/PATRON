// Another staff member's photograph, for the lists a priest or manager sees.
//
// Not PriestPhoto: that one is the PUBLIC parish page, where the bytes are served
// unauthenticated and a plain <img src> works. This read is authenticated — same-parish
// staff only, enforced by app_user_parish_select rather than by anything here — and an
// <img src> cannot send a Bearer header, so the bytes come through lib/api.js as a blob.
//
// hasPhoto comes from the list that named this person, so no request is made unless
// there is something to fetch. A failed read falls back to the initial, which keeps the
// list correct before the routes are deployed and if a photo is removed mid-session.

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
