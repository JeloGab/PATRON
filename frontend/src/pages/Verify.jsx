import { useMemo, useState } from 'react'
import TopNav from '../components/TopNav.jsx'
import { sampleDocuments } from '../data/mock.js'

export default function Verify() {
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState('')

  const result = useMemo(() => {
    if (!submitted) return null
    const record = sampleDocuments[submitted]
    if (!record) {
      return { status: 'unknown', code: submitted }
    }
    return { status: record.valid ? 'valid' : 'revoked', code: submitted, record }
  }, [submitted])

  function onSubmit(event) {
    event.preventDefault()
    setSubmitted(code.trim().toUpperCase())
  }

  return (
    <div className="shell">
      <TopNav />

      <main className="stage">
        <div className="page">
          <header className="page__hero">
            <div>
              <p className="eyebrow">Public verification</p>
              <h1>Verify a document</h1>
              <p className="lede">
                Enter the PATRON reference printed on a baptismal, marriage, or confirmation
                certificate. No account required — the system checks the issuing parish ledger
                without exposing private registry books.
              </p>
            </div>
          </header>

          <form className="verify-bar" onSubmit={onSubmit}>
            <label className="verify-bar__field">
              <span>Document reference</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PTRN-NGA-2024-10482"
                autoComplete="off"
                spellCheck="false"
              />
            </label>
            <button type="submit" className="btn btn--gold">
              Verify
            </button>
          </form>

          <p className="hint">
            Try a sample:{' '}
            <button type="button" className="text-btn" onClick={() => setCode('PTRN-NGA-2024-10482')}>
              valid baptism
            </button>
            {' · '}
            <button type="button" className="text-btn" onClick={() => setCode('PTRN-PEN-2023-07721')}>
              valid marriage
            </button>
            {' · '}
            <button type="button" className="text-btn" onClick={() => setCode('PTRN-LIB-2022-00319')}>
              revoked
            </button>
          </p>

          {result && (
            <section className={`result result--${result.status}`}>
              {result.status === 'unknown' && (
                <>
                  <p className="result__status">Not found</p>
                  <h2>No record for {result.code}</h2>
                  <p className="muted">
                    This reference is not in the PATRON ledger. Confirm the code on the certificate,
                    or ask the issuing parish to register the document.
                  </p>
                </>
              )}

              {result.status === 'valid' && (
                <>
                  <p className="result__status">Authentic</p>
                  <h2>{result.record.type}</h2>
                  <dl className="facts">
                    <div>
                      <dt>Issued to</dt>
                      <dd>{result.record.holder}</dd>
                    </div>
                    <div>
                      <dt>Parish</dt>
                      <dd>{result.record.parish}</dd>
                    </div>
                    <div>
                      <dt>Date issued</dt>
                      <dd>{result.record.issued}</dd>
                    </div>
                    <div>
                      <dt>Registry</dt>
                      <dd>{result.record.registry}</dd>
                    </div>
                    <div>
                      <dt>Integrity seal</dt>
                      <dd className="mono">{result.record.hash}</dd>
                    </div>
                  </dl>
                </>
              )}

              {result.status === 'revoked' && (
                <>
                  <p className="result__status">Not authentic</p>
                  <h2>This certificate has been revoked</h2>
                  <p>{result.record.reason}</p>
                  <p className="muted">Reference {result.code}</p>
                </>
              )}
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
