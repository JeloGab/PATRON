// The signed-in account's own photograph in the top bar, or their initial.

import { useEffect, useRef, useState } from 'react'
import { authed } from '../lib/api.js'
import { onPhotoChange } from '../lib/photoBus.js'

export default function Avatar({ initial, hasPhoto = false }) {
  const [url, setUrl] = useState(null)
  const [version, setVersion] = useState(0)
  const shown = useRef(null)

  useEffect(() => onPhotoChange(() => setVersion((current) => current + 1)), [])

  useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current)
    },
    [],
  )

  useEffect(() => {
    let live = true

    async function load() {
      const r = await authed({ path: `/api/auth/photo?v=${version}`, as: 'blob' })
      if (!live) return

      const next = r.ok ? URL.createObjectURL(r.blob) : null
      if (shown.current) URL.revokeObjectURL(shown.current)
      shown.current = next
      setUrl(next)
    }

    load()
    return () => {
      live = false
    }
  }, [hasPhoto, version])

  if (!url) {
    return (
      <div className="avatar" aria-hidden="true">
        {initial}
      </div>
    )
  }

  return <img className="avatar avatar--photo" src={url} alt="" />
}
