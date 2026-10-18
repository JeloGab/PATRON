import { useState } from 'react'
import Modal from './Modal.jsx'

// Registering a parish and provisioning its priests were one form. They are now two
// actions, because the API has no coupling between them:
//
//   POST /api/admin/parishes   { name, address, contactNo, email? }
//   POST /api/admin/priests    { fullName, parishId }
//
// Combining them meant N+1 requests with no transaction, so "parish created, 2 of 3
// priests provisioned" was a state the UI had to report. It also implied priests are
// fixed at registration, which is the opposite of the reassignment rule — a priest
// moving parish is deactivated at the old one and provisioned fresh at the new one,
// so provisioning recurs over a parish's whole life.
//
// `onRegister` returns an error message to display, or nothing on success.

// PH mobile only, the same rule `requireMobile` enforces server-side. Checked here so
// a typo does not cost a round trip, but the server remains the authority.
const MOBILE = /^09\d{9}$/

export default function RegisterParishModal({ open, onClose, onRegister }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function reset() {
    setName('')
    setAddress('')
    setContactNo('')
    setEmail('')
    setError('')
    setPending(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const trimmedContact = contactNo.trim()

    if (!trimmedName || !trimmedAddress || !trimmedContact) {
      setError('Parish name, address and contact number are required.')
      return
    }
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setError('Parish name must be between 3 and 50 characters.')
      return
    }
    if (trimmedAddress.length < 5) {
      setError('Address must be at least 5 characters.')
      return
    }
    if (!MOBILE.test(trimmedContact)) {
      setError('Contact number must be a PH mobile number, e.g. 09171234567.')
      return
    }

    setPending(true)
    const message = await onRegister({
      name: trimmedName,
      address: trimmedAddress,
      contactNo: trimmedContact,
      email: email.trim() || undefined,
    })
    setPending(false)

    if (message) {
      setError(message)
      return
    }
    close()
  }

  return (
    <Modal title="Register parish" open={open} onClose={close}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted field--full">
          Adds the parish to the diocesan registry. Priests are provisioned separately, from the
          parish once it exists.
        </p>

        {error && (
          <p className="alert field--full" role="alert">
            {error}
          </p>
        )}

        <label className="field field--full">
          <span>Parish name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. San Francisco Parish"
            autoFocus
          />
        </label>

        <label className="field field--full">
          <span>Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, barangay, municipality, province"
          />
        </label>

        <label className="field">
          <span>Contact number</span>
          <input
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value)}
            placeholder="09171234567"
            inputMode="numeric"
          />
        </label>

        <label className="field">
          <span>Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parish@example.com"
          />
        </label>

        <div className="form-actions field--full">
          <p className="form-hint muted">
            The address decides the municipality shown on the card. Email appears on the public
            parish directory.
          </p>
          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={close} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold" disabled={pending}>
              {pending ? 'Registering…' : 'Register parish'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
