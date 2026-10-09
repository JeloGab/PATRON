import { useState } from 'react'
import Modal from './Modal.jsx'

// One provisioning surface, used by both tiers:
//
//   sysadmin → priest    POST /api/admin/priests   { fullName, parishId }
//   priest   → manager   POST /api/users/managers  { fullName }
//
// The role used to be a select in this modal, which was wrong in one direction only:
// a sysadmin cannot provision a manager — `/api/users/managers` is
// `requireRole('priest')` — so offering the choice here promised a route that does not
// exist. The caller fixes the role instead, and the modal is reused rather than
// duplicated.
//
// Date of birth and address were also removed: `app_user` has no columns for them, so
// they were collected and discarded.
//
// `onProvision({ fullName })` returns either `{ error }` or
// `{ credentials: { fullName, username, tempPassword } }`.
export default function StaffProvisionModal({
  open,
  onClose,
  onProvision,
  roleLabel = 'staff member',
  scopeLabel,
  disabled = false,
}) {
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setFullName('')
    setError('')
    setPending(false)
    setCredentials(null)
    setCopied(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const trimmed = fullName.trim()
    if (!trimmed) {
      setError('Enter the full name.')
      return
    }
    // `requireFullName` is 2–50 server-side.
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError('Full name must be between 2 and 50 characters.')
      return
    }

    setPending(true)
    const result = await onProvision({ fullName: trimmed })
    setPending(false)

    if (result?.error) {
      setError(result.error)
      return
    }
    // Deliberately does NOT close. The username is derived by the server and the
    // temporary password is stored only as a bcrypt hash — neither can be retrieved
    // again, so the dialog has to stay up until it is explicitly dismissed.
    setCredentials(result.credentials)
  }

  async function copyCredentials() {
    const text = `Username: ${credentials.username}\nTemporary password: ${credentials.tempPassword}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard access is refused in some contexts; the values are on screen anyway.
      setCopied(false)
    }
  }

  const title = credentials ? 'Account created' : `Provision ${roleLabel}`

  return (
    <Modal title={title} open={open} onClose={close}>
      {credentials ? (
        <div className="stack">
          <p className="notice">
            Hand these over in person. The temporary password is shown <strong>once</strong> and
            cannot be recovered — if it is lost, reset the password to issue a new one.
          </p>

          <dl className="facts">
            <div>
              <dt>Name</dt>
              <dd>{credentials.fullName}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd className="mono">{credentials.username}</dd>
            </div>
            <div>
              <dt>Temporary password</dt>
              <dd className="mono">{credentials.tempPassword}</dd>
            </div>
          </dl>

          <p className="muted">
            They must change this password at first sign in — nothing else in PATRON is reachable
            until they do.
          </p>

          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={copyCredentials}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="btn btn--gold" onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <p className="muted field--full">
            Creates a {roleLabel} account{scopeLabel ? ` for ${scopeLabel}` : ''}. The username is
            derived from the name, and a temporary password is issued once.
          </p>

          {error && (
            <p className="alert field--full" role="alert">
              {error}
            </p>
          )}

          <label className="field field--full">
            <span>Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Rev. Fr. Juan dela Cruz"
              autoFocus
            />
          </label>

          <div className="form-actions field--full">
            <p className="form-hint muted">
              Accounts are never deleted — deactivate instead, so the audit trail survives.
            </p>
            <div className="form-actions__buttons">
              <button type="button" className="btn btn--ghost" onClick={close} disabled={pending}>
                Cancel
              </button>
              <button type="submit" className="btn btn--gold" disabled={pending || disabled}>
                {pending ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
