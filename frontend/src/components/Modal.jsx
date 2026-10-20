// The shared modal shell; a stack, so Escape and scroll-lock still work when they nest.

import { useEffect } from 'react'

const stack = []

export default function Modal({ title, open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined

    const token = {}
    stack.push(token)
    document.body.style.overflow = 'hidden'

    function onKey(event) {
      if (event.key !== 'Escape') return
      if (stack[stack.length - 1] !== token) return
      onClose()
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const index = stack.indexOf(token)
      if (index !== -1) stack.splice(index, 1)
      if (stack.length === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
