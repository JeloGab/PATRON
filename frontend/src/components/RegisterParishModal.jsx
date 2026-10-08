import { useState } from 'react'
import Modal from './Modal.jsx'
import { createParishId, municipalityFromAddress } from '../lib/parishes.js'

const ACCENTS = ['#5c1824', '#4a1c14', '#3d5a3a', '#2c3d5a', '#1e4d6b', '#3b2a55']

function rowId() {
  return globalThis.crypto?.randomUUID?.() ?? `priest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyPriestRow() {
  return { id: rowId(), name: '' }
}

export default function RegisterParishModal({ open, onClose, onRegister }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [priests, setPriests] = useState([emptyPriestRow()])
  const [error, setError] = useState('')

  function reset() {
    setName('')
    setAddress('')
    setPriests([emptyPriestRow()])
    setError('')
  }

  function close() {
    reset()
    onClose()
  }

  function updatePriest(id, value) {
    setPriests((rows) => rows.map((row) => (row.id === id ? { ...row, name: value } : row)))
  }

  function addPriest() {
    setPriests((rows) => [...rows, emptyPriestRow()])
  }

  function removePriest(id) {
    setPriests((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== id)))
  }

  function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const priestNames = priests.map((row) => row.name.trim()).filter(Boolean)

    if (!trimmedName || !trimmedAddress) {
      setError('Parish name and address are required.')
      return
    }
    if (priestNames.length === 0) {
      setError('Add at least one parish priest.')
      return
    }

    onRegister({
      id: createParishId(trimmedName),
      name: trimmedName,
      address: trimmedAddress,
      diocese: 'Pending diocesan assignment',
      municipality: municipalityFromAddress(trimmedAddress),
      priests: priestNames,
      staffCount: priestNames.length,
      parishioners: 0,
      registeredAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    })
    close()
  }

  return (
    <Modal title="Register parish" open={open} onClose={close}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted field--full">
          Add a parish to the PATRON registry. This form is frontend-only and saves to your browser.
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

        <div className="field field--full">
          <span>Parish priest(s)</span>
          <ul className="priest-list">
            {priests.map((row, index) => (
              <li key={row.id} className="priest-list__row">
                <input
                  value={row.name}
                  onChange={(e) => updatePriest(row.id, e.target.value)}
                  placeholder={index === 0 ? 'Rev. Fr. …' : 'Additional priest (optional)'}
                  aria-label={`Parish priest ${index + 1}`}
                />
                <button
                  type="button"
                  className="btn btn--ghost priest-list__remove"
                  onClick={() => removePriest(row.id)}
                  disabled={priests.length === 1}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="text-btn" onClick={addPriest}>
            + Add another priest
          </button>
        </div>

        <div className="form-actions field--full">
          <p className="form-hint muted">New parishes start as active with zero parishioners on record.</p>
          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold">
              Register parish
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
