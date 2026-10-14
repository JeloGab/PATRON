// A parish photo from public/churches/<parishId>.jpg if present, else a crest.

import { useState } from 'react'

const EXTENSIONS = ['jpg', 'png']

function churchImageCandidates(id) {
  if (!id) return []
  return EXTENSIONS.map((ext) => `/churches/${id}.${ext}`)
}

function crestLetter(name) {
  const letter = String(name ?? '').trim().slice(0, 1).toUpperCase()
  return letter || '✝'
}

export default function ChurchMedia({ id, accent, className = '', children, alt = '', name }) {
  const [srcIndex, setSrcIndex] = useState(0)
  const candidates = churchImageCandidates(id)
  const src = candidates[srcIndex] || null

  function handleError() {
    setSrcIndex((index) => index + 1)
  }

  return (
    <div className={`${className} ${src ? 'has-photo' : ''}`.trim()} style={{ '--accent': accent }}>
      {src ? (
        <img className="church-media__img" src={src} alt={alt} onError={handleError} />
      ) : (
        <span className="church-media__crest" aria-hidden="true">
          {crestLetter(name ?? alt)}
        </span>
      )}
      {children}
    </div>
  )
}
