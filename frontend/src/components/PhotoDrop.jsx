// The shared drop target for ledger photos: drag-and-drop, or the file picker.

import { useState } from 'react'
import { ACCEPT } from '../lib/fileCheck.js'

export default function PhotoDrop({
  onFiles,
  disabled = false,
  multiple = false,
  accept = ACCEPT,
  lead = 'Drag a photo of the register page here',
  busyLead = 'Uploading…',
  busy = false,
  hint,
}) {
  const [dragging, setDragging] = useState(false)

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
          accept={accept}
          multiple={multiple}
          onChange={onPick}
          disabled={disabled || busy}
        />
      </label>
      {hint && <p className="form-hint muted">{hint}</p>}
    </div>
  )
}
