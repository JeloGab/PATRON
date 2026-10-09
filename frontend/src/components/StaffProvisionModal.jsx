import { useState } from 'react'
import Modal from './Modal.jsx'

const ROLES = [
  { value: 'parish_priest', label: 'Parish priest' },
  { value: 'parish_manager', label: 'Parish manager' },
]

export default function StaffProvisionModal({ open, onClose, parishes, onProvision }) {
  const [parishId, setParishId] = useState('')
  const [role, setRole] = useState('parish_priest')
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setParishId(parishes[0]?.id || '')
    setRole('parish_priest')
    setFullName('')
    setDateOfBirth('')
    setAddress('')
    setError('')
  }

  function close() {
    reset()
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    if (!parishId) {
      setError('Select a parish.')
      return
    }
    if (!fullName.trim() || !dateOfBirth.trim() || !address.trim()) {
      setError('Full name, date of birth, and address are required.')
      return
    }

    onProvision({
      parishId,
      role,
      fullName: fullName.trim(),
      dateOfBirth,
      address: address.trim(),
    })
    close()
  }

  const effectiveParishId = parishId || parishes[0]?.id || ''

  return (
    <Modal title="Staff provision" open={open} onClose={close}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted field--full">
          Create a staff account for a registered parish. Credentials would be issued by the backend
          in production; here the staff count is updated locally.
        </p>

        {error && (
          <p className="alert field--full" role="alert">
            {error}
          </p>
        )}

        <label className="field">
          <span>Parish</span>
          <select
            value={effectiveParishId}
            onChange={(e) => setParishId(e.target.value)}
            disabled={parishes.length === 0}
          >
            {parishes.length === 0 ? (
              <option value="">No parishes registered</option>
            ) : (
              parishes.map((parish) => (
                <option key={parish.id} value={parish.id}>
                  {parish.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="field">
          <span>Parish role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--full">
          <span>Staff full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Given name and surname"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Date of birth</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </label>

        <label className="field field--full">
          <span>Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Residential address"
          />
        </label>

        <div className="form-actions field--full">
          <p className="form-hint muted">Staff provision increases the parish staff count by one.</p>
          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold" disabled={parishes.length === 0}>
              Create staff account
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
