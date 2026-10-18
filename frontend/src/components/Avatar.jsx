// The signed-in account's own photograph in the top bar, or their initial.
//
// An <img src> cannot send an Authorization header, so the bytes are read through
// lib/api.js as a blob and shown from an object URL. hasPhoto comes from the session,
// which /api/auth/me fills, so the request is only made when there is something to
// fetch — and the initial stays the empty state everywhere, which is why nothing here
// needs a placeholder image or breaks before the routes are deployed.

import { useEffect, useState } from 'react'
import { authed } from '../lib/api.js'

export default function Avatar({ initial, hasPhoto = false }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let live = true
    let created = null

    if (!hasPhoto) {
      setUrl(null)
      return undefined
    }

    async function load() {
      const r = await authed({ path: '/api/auth/photo', as: 'blob' })
      if (!live || !r.ok) return
      created = URL.createObjectURL(r.blob)
      setUrl(created)
    }

    load()
    return () => {
      live = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [hasPhoto])

  if (!url) {
    return (
      <div className="avatar" aria-hidden="true">
        {initial}
      </div>
    )
  }

  return <img className="avatar avatar--photo" src={url} alt="" />
}
