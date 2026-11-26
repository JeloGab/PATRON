// The signed-in account's own photograph in the top bar, or their initial.

import { useEffect, useState } from 'react'
import { authed } from '../lib/api.js'

export default function Avatar({ initial, hasPhoto = false }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let live = true
    let created = null

    async function load() {
      const r = await authed({ path: '/api/auth/photo', as: 'blob' })
      if (!live) return
      if (!r.ok) {
        setUrl(null)
        return
      }
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
