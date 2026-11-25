// The parish's Facebook page. Facebook Login for Business is the normal path; pasting a
// page token is the fallback.
// GET /api/parish/facebook/connect-url · POST /api/parish/facebook/connect
// POST /api/parish/facebook-token · DELETE /api/parish/facebook-token

import { useEffect, useRef, useState } from 'react'
import { authed, isSessionError } from '../lib/api.js'
import { messageFor } from '../lib/errors.js'
import { clearFacebookReturn, peekFacebookReturn } from '../lib/oauthReturn.js'

export default function FacebookPageCard({ parish, onChanged, onSessionEnd }) {
  const [token, setToken] = useState('')
  const [entering, setEntering] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const claimed = useRef(false)

  const hasPage = Boolean(parish.facebookPageId)
  const connected = parish.hasFacebookToken === true

  // An OAuth code is single-use at Facebook, and StrictMode invokes effects twice — so
  // without this ref the second run would exchange a spent code and report a failure
  // over a connection that actually succeeded. Set synchronously, before any await.
  useEffect(() => {
    if (claimed.current) return
    const returned = peekFacebookReturn()
    if (!returned) return
    claimed.current = true

    if (returned.error) {
      clearFacebookReturn()
      setError(
        returned.error === 'user_denied'
          ? 'The connection was cancelled on Facebook, so nothing changed.'
          : `Facebook returned: ${returned.error}`,
      )
      return
    }

    async function finish() {
      setBusy('oauth')
      const r = await authed({
        method: 'POST',
        path: '/api/parish/facebook/connect',
        body: { code: returned.code, state: returned.state },
      })
      setBusy('')
      clearFacebookReturn()

      if (isSessionError(r)) {
        onSessionEnd()
        return
      }
      if (!r.ok) {
        setError(messageFor(r))
        return
      }
      setNotice('The Facebook page is connected.')
      onChanged(r.json.parish)
    }

    finish()
  }, [onChanged, onSessionEnd])

  function close() {
    setToken('')
    setEntering(false)
    setConfirming(false)
    setError('')
  }

  // Leaving the app is the point — this is a full redirect, not a popup, so the return
  // lands on a URL Facebook has whitelisted and oauthReturn.js can claim.
  async function startLogin() {
    setError('')
    setNotice('')
    setBusy('start')
    const r = await authed({ path: '/api/parish/facebook/connect-url' })
    setBusy('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }
    window.location.assign(r.json.url)
  }

  async function sendToken(method, body) {
    setError('')
    setNotice('')
    setBusy('token')
    const r = await authed({ method, path: '/api/parish/facebook-token', body })
    setBusy('')

    // Cleared whatever the answer. A page token is pasted, never typed, so there is
    // nothing to correct by hand — and the commonest rejection is a newline picked up in
    // the copy, which only a fresh paste fixes.
    setToken('')

    if (isSessionError(r)) {
      onSessionEnd()
      return
    }
    if (!r.ok) {
      setError(messageFor(r))
      return
    }

    close()
    setNotice(method === 'DELETE' ? 'The page was disconnected.' : 'The page is connected.')
    onChanged(r.json.parish)
  }

  return (
    <section className="card">
      <p className="eyebrow">Facebook page</p>

      {notice && <p className="notice">{notice}</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <dl className="facts facts--stacked">
        <div>
          <dt>Page</dt>
          <dd>{parish.facebookPageId || 'Not connected'}</dd>
        </div>
        <div>
          <dt>Posting</dt>
          <dd>
            <span className={`fb-card__dot ${connected ? 'is-on' : ''}`} aria-hidden="true" />
            {connected ? 'Connected' : 'Not connected'}
          </dd>
        </div>
      </dl>

      {busy === 'oauth' ? (
        <p className="muted">Finishing the connection with Facebook…</p>
      ) : (
        <>
          <p className="muted">
            {connected
              ? 'Approved announcements are posted to this page. While the Meta app is in development mode the posts are visible only to people holding a role on it.'
              : 'Connect the parish page and every announcement a priest approves is posted to it as well.'}
          </p>

          {entering ? (
            <div className="form-grid">
              {!hasPage && (
                <p className="alert field--full">
                  A token cannot be stored without the page it belongs to. Set the Facebook
                  page under <strong>Edit details</strong> first, or use{' '}
                  <strong>Connect Facebook page</strong>, which fills both in.
                </p>
              )}
              <label className="field field--full">
                <span>Page access token</span>
                <input
                  type="password"
                  value={token}
                  autoComplete="off"
                  spellCheck="false"
                  onChange={(changed) => setToken(changed.target.value)}
                  placeholder="Paste it with no line breaks"
                />
              </label>
              <div className="form-actions__buttons field--full">
                <button type="button" className="btn btn--ghost" onClick={close}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={busy === 'token' || !token.trim() || !hasPage}
                  onClick={() => sendToken('POST', { token: token.trim() })}
                >
                  {busy === 'token' ? 'Saving…' : 'Save token'}
                </button>
              </div>
            </div>
          ) : confirming ? (
            <div className="form-grid">
              <p className="alert field--full">
                Disconnecting stops every future announcement from reaching this page. The
                parish has to grant access again to undo it.
              </p>
              <div className="form-actions__buttons field--full">
                <button type="button" className="btn btn--ghost" onClick={close}>
                  Keep it connected
                </button>
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={busy === 'token'}
                  onClick={() => sendToken('DELETE')}
                >
                  {busy === 'token' ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-actions__buttons">
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={busy === 'start'}
                  onClick={startLogin}
                >
                  {busy === 'start'
                    ? 'Opening Facebook…'
                    : connected
                      ? 'Reconnect page'
                      : 'Connect Facebook page'}
                </button>
                {connected && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setConfirming(true)}
                  >
                    Disconnect
                  </button>
                )}
              </div>
              <p className="fb-card__alt">
                <button type="button" className="link-btn" onClick={() => setEntering(true)}>
                  Connect with a page token instead
                </button>
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}
