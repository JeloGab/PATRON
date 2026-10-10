import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { call } from '../lib/api.js'
import { formatLongDate } from '../lib/dates.js'

// The public verifier — one of three unauthenticated surfaces, and the one a panel is
// most likely to scan at a defence.
//
// Reached two ways:
//
//   /verify            typed by hand, off a photocopy or a fax
//   /verify/<code>     scanned. Every certificate's QR encodes
//                      `${CLIENT_ORIGIN}/#/verify/<code>` (documents.services.js:14),
//                      which is why the app is on HashRouter: a hash route cannot
//                      404 on refresh, so the QR works on any static host with no
//                      rewrite rule configured.
//
// It does NOT render TopNav. Partly because a staff navigation bar has no business on
// a public page, and partly because TopNav's PriestNav calls useParish() — this route
// is outside every provider, so a signed-in priest opening the verifier would crash
// the page outright.
//
// Three things the mock promised that the real contract does not carry:
//
//   revoked        nothing in PATRON revokes a certificate. The response is
//                  `valid: true` or `valid: false`, two states, not three.
//   registry       book/page/entry are deliberately OUTSIDE the verifier's security
//   integrity hash boundary. `certificate_verification` is a view whose five columns
//                  are the boundary: code, document name, subject, parish, issued
//                  date. Anything else printed on the paper is confirmed with the
//                  issuing parish directly.
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

    // The route always answers 200, even for a malformed or unknown code — so
    // `!r.ok` here means the request itself failed, never "not found". The server
    // normalises the code (uppercase, spaces and dashes stripped) because it is typed
    // off printed paper, so it is sent exactly as given.
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

  // A scanned QR arrives with the code already in the URL, so it verifies on arrival
  // rather than asking someone holding a phone to press a button.
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
