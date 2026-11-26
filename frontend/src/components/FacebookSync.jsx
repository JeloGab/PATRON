// Whether an approved announcement reached the parish's Facebook page, and the buttons for it.

import { useCallback, useEffect, useRef, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import {
  SYNC_HINT,
  SYNC_LABEL,
  canCheckFacebook,
  canPostToFacebook,
  checkedLabel,
  postUrl,
  syncPill,
  syncStateOf,
} from '../lib/facebook.js'

const STALE_MS = 10 * 60 * 1000

const POST_LABEL = {
  failed: 'Try again',
  removed: 'Post again',
}

export default function FacebookSync({ announcement, onChanged, onSessionEnd }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const probed = useRef(false)

  const state = syncStateOf(announcement)
  const link = state === 'synced' ? postUrl(announcement.facebookPostId) : null
  const checkable = canCheckFacebook(announcement)

  const check = useCallback(
    async (quiet) => {
      if (!quiet) setError('')
      setChecking(true)
      const r = await authed({
        method: 'POST',
        path: `/api/announcements/${announcement.announcementId}/facebook-check`,
      })
      setChecking(false)

      if (isSessionError(r)) {
        onSessionEnd()
        return
      }
      if (!r.ok) {
        if (!quiet) setError(messageFor(r))
        return
      }

      onChanged(r.json.announcement)
    },
    [announcement.announcementId, onChanged, onSessionEnd]
  )

  useEffect(() => {
    if (probed.current || state !== 'synced' || !announcement.facebookPostId) return

    const checkedAt = announcement.facebookCheckedAt
    const stale = !checkedAt || Date.now() - new Date(checkedAt).getTime() > STALE_MS
    if (!stale) return

    probed.current = true
    check(true)
  }, [state, announcement.facebookPostId, announcement.facebookCheckedAt, check])

  if (announcement.status !== 'approved') return null

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
        <div className="fb-sync__actions">
          {checkable && (
            <button
              type="button"
              className="btn btn--ghost btn--tight"
              onClick={() => check(false)}
              disabled={checking || busy}
            >
              {checking ? 'Checking…' : 'Re-check'}
            </button>
          )}
          {canPostToFacebook(announcement) && (
            <button
              type="button"
              className="btn btn--gold btn--tight"
              onClick={post}
              disabled={busy || checking}
            >
              {busy ? 'Posting…' : (POST_LABEL[state] ?? 'Post to Facebook')}
            </button>
          )}
        </div>
      </div>

      <p className="fb-sync__hint">{SYNC_HINT[state]}</p>
      {checkable && (
        <p className="fb-sync__hint muted">{checkedLabel(announcement.facebookCheckedAt)}</p>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
