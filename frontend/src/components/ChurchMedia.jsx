import { useState } from 'react'

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP']

export function churchImageCandidates(id) {
  return EXTENSIONS.map((ext) => `/churches/${id}.${ext}`)
}

export default function ChurchMedia({
  id,
  accent,
  className = '',
  children,
  alt = '',
}) {
  const [srcIndex, setSrcIndex] = useState(0)
  const candidates = churchImageCandidates(id)
  const src = candidates[srcIndex] || null

  function handleError() {
    setSrcIndex((i) => i + 1)
  }

  return (
    <div className={`${className} ${src ? 'has-photo' : ''}`.trim()} style={{ '--accent': accent }}>
      {src && (
        <img
          className="church-media__img"
          src={src}
          alt={alt}
          onError={handleError}
        />
      )}
      {children}
    </div>
  )
}
