import { useState } from 'react'
import { ACCEPT } from '../lib/fileCheck.js'

// The drop target, used in two places: holding one file in the encode form, and
// uploading straight away on a saved entry. Presentational only — it hands files up
// and knows nothing about records or requests.
export default function PhotoDrop({
  onFiles,
  disabled = false,
  multiple = false,
  lead = 'Drag a photo of the register page here',
  busyLead = 'Uploading…',
  busy = false,
  hint,
}) {
  const [dragging, setDragging] = useState(false)

  // dragover MUST preventDefault, or the browser treats the drop as navigation and
  // opens the file in the tab instead of handing it over. This is the usual reason a
  // drop target appears to do nothing at all.
  function onDragOver(event) {
    event.preventDefault()
    if (!disabled && !dragging) setDragging(true)
  }

  function onDragLeave(event) {
    event.preventDefault()
    setDragging(false)
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  function onPick(event) {
    // Array.from BEFORE clearing the input. `input.files` is a LIVE FileList: reset
    // the input first and the array just read out of it is empty, the upload silently
    // receives nothing, and drag-and-drop still works — which is exactly what makes
    // it so hard to spot.
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      className={`dropzone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <p className="dropzone__lead">{busy ? busyLead : dragging ? 'Drop to attach' : lead}</p>
      <label className="dropzone__pick">
        <span className="text-btn">or choose a file</span>
        <input
          type="file"
          className="sr-only"
          accept={ACCEPT}
          multiple={multiple}
          onChange={onPick}
          disabled={disabled || busy}
        />
      </label>
      {hint && <p className="form-hint muted">{hint}</p>}
    </div>
  )
}
