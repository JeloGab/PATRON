// Whether an approved announcement reached the parish's Facebook page, and one button
// to try again when it did not. POST /api/announcements/:id/sync.

import { useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import {
  SYNC_HINT,
  SYNC_LABEL,
  canPostToFacebook,
  postUrl,
  syncPill,
  syncStateOf,
} from '../lib/facebook.js'

export default function FacebookSync({ announcement, onChanged, onSessionEnd }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Pending, rejected and archived announcements have no Facebook state to report, and
  // the database refuses to post them, so the strip does not exist for them.
  if (announcement.status !== 'approved') return null

  const state = syncStateOf(announcement)
  const link = state === 'synced' ? postUrl(announcement.facebookPostId) : null

  async function post() {
    setError('')
    setBusy(true)
    const r = await authed({
      method: 'POST',
      path: `/api/announcements/${announcement.announcementId}/sync`,
    })
    setBusy(false)

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    // The route answers 200 with sync_status = 'failed' when Facebook refused — the
    // post is a separate outcome from the request, so the result is read rather than
    // assumed. onChanged carries the fresh announcement up so the strip re-renders
    // from the server's answer and not from hope.
    if (r.json.announcement?.syncStatus === 'failed') {
      setError('Facebook refused the post. The server log holds the reason it gave.')
    }
    onChanged(r.json.announcement)
  }

  return (
    <div className="fb-sync">
      <div className="fb-sync__head">
        <span className={syncPill(state)}>{SYNC_LABEL[state]}</span>
        {link && (
          <a className="fb-sync__link" href={link} target="_blank" rel="noreferrer noopener">
            View the post
          </a>
        )}
        {canPostToFacebook(announcement) && (
          <button type="button" className="btn btn--ghost btn--tight" onClick={post} disabled={busy}>
            {busy ? 'Posting…' : state === 'failed' ? 'Try again' : 'Post to Facebook'}
          </button>
        )}
      </div>

      <p className="fb-sync__hint">{SYNC_HINT[state]}</p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
