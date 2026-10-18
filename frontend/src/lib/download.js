// Certificate PDFs: fetched with the token, handed to a detached anchor.

import { authed, isSessionError } from './api.js'
import { messageFor } from './errors.js'

export async function downloadPdf({ path, fileName, onSessionEnd }) {
  const r = await authed({ path, as: 'blob' })

  if (isSessionError(r)) {
    onSessionEnd?.()
    return 'Session ended.'
  }
  if (!r.ok) return messageFor(r)

  const url = URL.createObjectURL(r.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName

  link.click()

  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return null
}

export function certificateFileName(code) {
  return `PATRON-certificate-${code ?? 'copy'}.pdf`
}
