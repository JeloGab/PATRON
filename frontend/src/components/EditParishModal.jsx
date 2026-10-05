import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { municipalityFromAddress } from '../lib/parishes.js'

function rowId() {
  return globalThis.crypto?.randomUUID?.() ?? `priest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toPriestRows(priests = []) {
  if (priests.length === 0) return [{ id: rowId(), name: '' }]
  return priests.map((name) => ({ id: rowId(), name }))
}

export default function EditParishModal({ open, parish, onClose, onSave }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [diocese, setDiocese] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [priests, setPriests] = useState([{ id: rowId(), name: '' }])
  const [staffCount, setStaffCount] = useState(0)
  const [parishioners, setParishioners] = useState(0)
  const [registeredAt, setRegisteredAt] = useState('')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !parish) return
    setName(parish.name || '')
    setAddress(parish.address || '')
    setDiocese(parish.diocese || '')
    setMunicipality(parish.municipality || '')
    setPriests(toPriestRows(parish.priests))
    setStaffCount(parish.staffCount ?? 0)
    setParishioners(parish.parishioners ?? 0)
    setRegisteredAt(parish.registeredAt || '')
    setStatus(parish.status || 'active')
    setError('')
  }, [open, parish])

  function close() {
    setError('')
    onClose()
  }

  function updatePriest(id, value) {
    setPriests((rows) => rows.map((row) => (row.id === id ? { ...row, name: value } : row)))
  }

  function addPriest() {
    setPriests((rows) => [...rows, { id: rowId(), name: '' }])
  }

  function removePriest(id) {
    setPriests((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== id)))
  }

  function submit(event) {
    event.preventDefault()
    if (!parish) return

    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const trimmedDiocese = diocese.trim()
    const trimmedMunicipality =
      municipality.trim() || municipalityFromAddress(trimmedAddress)
    const priestNames = priests.map((row) => row.name.trim()).filter(Boolean)
    const staff = Number(staffCount)
    const count = Number(parishioners)

    if (!trimmedName || !trimmedAddress || !trimmedDiocese) {
      setError('Parish name, address, and diocese are required.')
      return
    }
    if (priestNames.length === 0) {
      setError('Add at least one parish priest.')
      return
    }
    if (!Number.isFinite(staff) || staff < 0 || !Number.isFinite(count) || count < 0) {
      setError('Staff and parishioner counts must be zero or greater.')
      return
    }
    if (!registeredAt) {
      setError('Date registered is required.')
      return
    }

    onSave({
      ...parish,
      name: trimmedName,
      address: trimmedAddress,
      diocese: trimmedDiocese,
      municipality: trimmedMunicipality,
      priests: priestNames,
      staffCount: Math.floor(staff),
      parishioners: Math.floor(count),
      registeredAt,
      status,
    })
    close()
  }

  return (
    <Modal title="Edit parish" open={open && Boolean(parish)} onClose={close}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted field--full">
          Update registry details for this parish. Changes are saved in your browser for this frontend
          demo.
        </p>

        {error && (
          <p className="alert field--full" role="alert">
            {error}
          </p>
        )}

        <label className="field field--full">
          <span>Parish name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <label className="field">
          <span>Diocese</span>
          <input value={diocese} onChange={(e) => setDiocese(e.target.value)} />
        </label>

        <label className="field">
          <span>Municipality</span>
          <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
        </label>

        <label className="field field--full">
          <span>Address</span>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <div className="field field--full">
          <span>Parish priest(s)</span>
          <ul className="priest-list">
            {priests.map((row, index) => (
              <li key={row.id} className="priest-list__row">
                <input
                  value={row.name}
                  onChange={(e) => updatePriest(row.id, e.target.value)}
                  placeholder={index === 0 ? 'Rev. Fr. …' : 'Additional priest'}
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

        <label className="field">
          <span>Staff number</span>
          <input
            type="number"
            min="0"
            step="1"
            value={staffCount}
            onChange={(e) => setStaffCount(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Number of parishioners</span>
          <input
            type="number"
            min="0"
            step="1"
            value={parishioners}
            onChange={(e) => setParishioners(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Date registered</span>
          <input
            type="date"
            value={registeredAt}
            onChange={(e) => setRegisteredAt(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <div className="form-actions field--full">
          <p className="form-hint muted">Click save to apply edits to the parish card.</p>
          <div className="form-actions__buttons">
            <button type="button" className="btn btn--ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn--gold">
              Save changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
