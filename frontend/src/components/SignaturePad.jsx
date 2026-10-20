// A draw-here box for the priest's signature; pointer events in, transparent PNG out.

import { useEffect, useRef, useState } from 'react'

const HEIGHT = 180
const STROKE = 2.2

export default function SignaturePad({ onSave, busy = false, saveLabel = 'Save signature' }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPoint = useRef(null)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function size() {
      const ratio = window.devicePixelRatio || 1
      const width = canvas.parentElement?.clientWidth ?? 600
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(HEIGHT * ratio)
      canvas.style.height = `${HEIGHT}px`

      const context = canvas.getContext('2d')
      context.scale(ratio, ratio)
      context.lineWidth = STROKE
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = '#1b1b1b'
    }

    size()
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [])

  function pointOf(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function start(event) {
    canvasRef.current.setPointerCapture(event.pointerId)
    drawing.current = true
    lastPoint.current = pointOf(event)
    setHasInk(true)
  }

  function move(event) {
    if (!drawing.current) return
    const context = canvasRef.current.getContext('2d')
    const point = pointOf(event)
    context.beginPath()
    context.moveTo(lastPoint.current.x, lastPoint.current.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPoint.current = point
  }

  function end(event) {
    drawing.current = false
    lastPoint.current = null
    try {
      canvasRef.current.releasePointerCapture(event.pointerId)
    } catch {
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()
    setHasInk(false)
  }

  function save() {
    canvasRef.current.toBlob((blob) => {
      if (blob) onSave(blob)
    }, 'image/png')
  }

  return (
    <div className="signature">
      <div className="signature__frame">
        <canvas
          ref={canvasRef}
          className="signature__canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        <span className="signature__rule" aria-hidden="true" />
        {!hasInk && <span className="signature__hint">Sign here</span>}
      </div>

      <div className="form-actions__buttons">
        <button type="button" className="btn btn--ghost" onClick={clear} disabled={!hasInk}>
          Clear
        </button>
        <button
          type="button"
          className="btn btn--gold"
          onClick={save}
          disabled={!hasInk || busy}
        >
          {busy ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  )
}
