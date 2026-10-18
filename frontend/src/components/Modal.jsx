import { useEffect } from 'react'

/* Modals can stack — the sysadmin registry opens a parish, then Provision priest on top
   of it. Two things break if each open modal acts alone: the inner one's cleanup clears
   body overflow while the outer is still up, letting the page scroll behind it; and
   Escape fires every listener, closing both at once. One module-level stack fixes both:
   only the topmost modal answers Escape, and the lock lifts when the last one leaves. */
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
