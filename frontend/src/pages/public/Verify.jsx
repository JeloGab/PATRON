// The public verifier: GET /api/verify/:code, five fields, no account needed.

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { call } from '../../lib/api.js'
import { formatLongDate } from '../../lib/dates.js'

export default function Verify() {
  const { code: codeFromUrl } = useParams()
  const [code, setCode] = useState(codeFromUrl ?? '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const lookup = useCallback(async (raw) => {
    const typed = String(raw ?? '').trim()
    if (!typed) return

    setPending(true)
    setError('')
    setResult(null)

    const r = await call({ path: `/api/verify/${encodeURIComponent(typed)}` })
    setPending(false)

    if (!r.ok) {
      setError(
        r.json?.code === 'TOO_MANY_ATTEMPTS'
          ? 'Too many checks from this connection. Wait about 15 minutes and try again.'
          : 'Could not reach the verification service. Please try again.',
      )
      return
    }

    setResult({ typed, valid: Boolean(r.json.valid), certificate: r.json.certificate ?? null })
  }, [])

  useEffect(() => {
    if (codeFromUrl) lookup(codeFromUrl)
  }, [codeFromUrl, lookup])

  function onSubmit(event) {
    event.preventDefault()
    lookup(code)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/verify" className="topbar__brand">
            <Logo compact />
          </Link>
          <Link to="/login" className="text-btn">
            Parish sign in
          </Link>
        </div>
      </header>

      <main className="stage">
        <div className="page">
          <header className="page__hero">
            <div>
              <p className="eyebrow">Public verification</p>
              <h1>Verify a document</h1>
              <p className="lede">
                Enter the reference printed beneath the QR code on a certificate. No account is
                needed — this confirms the certificate was issued by the parish named on it,
                without exposing the registry books.
              </p>
            </div>
          </header>

          <form className="verify-bar" onSubmit={onSubmit}>
            <label className="verify-bar__field">
              <span>Document reference</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 4KPX9QW2TM"
                autoComplete="off"
                spellCheck="false"
              />
            </label>
            <button type="submit" className="btn btn--gold" disabled={pending}>
              {pending ? 'Checking…' : 'Verify'}
            </button>
          </form>

          <p className="hint">
            Capitals, spaces and dashes do not matter — the code is normalised before it is
            checked.
          </p>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {result && !result.valid && (
            <section className="result result--unknown">
              <p className="result__status">Not found</p>
              <h2>No certificate for {result.typed}</h2>
              <p className="muted">
                This reference is not in the PATRON ledger. Check the code against the certificate,
                or contact the issuing parish directly.
              </p>
            </section>
          )}

          {result?.valid && result.certificate && (
            <section className="result result--valid">
              <p className="result__status">Authentic</p>
              <h2>{result.certificate.documentName}</h2>
              <dl className="facts">
                <div>
                  <dt>Issued to</dt>
                  <dd>{result.certificate.subjectName}</dd>
                </div>
                <div>
                  <dt>Issuing parish</dt>
                  <dd>{result.certificate.parishName}</dd>
                </div>
                <div>
                  <dt>Date issued</dt>
                  <dd>
                    {result.certificate.issuedOn
                      ? formatLongDate(result.certificate.issuedOn)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Reference</dt>
                  <dd className="mono">{result.certificate.verificationCode}</dd>
                </div>
              </dl>
              <p className="muted">
                Details beyond these — registry book and page, the purpose of the request, who
                requested it — are confirmed with the issuing parish, never shown here.
              </p>
            </section>
          )}
        </div>
      </main>

      <footer className="foot">
        <p>PATRON · Verifiable sacramental records for Catholic parishes</p>
      </footer>
    </div>
  )
}
