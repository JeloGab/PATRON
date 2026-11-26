// Replaces window.confirm and window.alert with a styled, promise-based dialog.

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from './Modal.jsx'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const value = useContext(ConfirmContext)
  if (!value) throw new Error('useConfirm needs ConfirmProvider above it')
  return value
}

export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const [copied, setCopied] = useState(false)
  const [ticked, setTicked] = useState(false)
  const resolver = useRef(null)

  function settle(answer) {
    const resolve = resolver.current
    const wanted = request?.wantsChecked === true
    const checked = ticked
    resolver.current = null
    setRequest(null)
    setCopied(false)
    setTicked(false)
    if (resolve) resolve(wanted ? { ok: answer === true, checked: answer === true && checked } : answer)
  }

  const open = useCallback((options) => {
    return new Promise((resolve) => {
      if (resolver.current) resolver.current(false)
      resolver.current = resolve
      setCopied(false)
      setTicked(options.checkedByDefault === true)
      setRequest(options)
    })
  }, [])

  const ask = useCallback(
    ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger' }) =>
      open({ kind: 'confirm', title, message, confirmLabel, cancelLabel, tone }),
    [open],
  )

  const askChecked = useCallback(
    ({
      title,
      message,
      checkboxLabel,
      checkedByDefault = false,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      tone = 'danger',
    }) =>
      open({
        kind: 'confirm',
        title,
        message,
        checkboxLabel,
        checkedByDefault,
        confirmLabel,
        cancelLabel,
        tone,
        wantsChecked: true,
      }),
    [open],
  )

  const notify = useCallback(
    ({ title, message, copyText = '', closeLabel = 'Done' }) =>
      open({ kind: 'notify', title, message, copyText, closeLabel }),
    [open],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(request.copyText)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const isNotify = request?.kind === 'notify'

  return (
    <ConfirmContext.Provider value={{ ask, askChecked, notify }}>
      {children}

      <Modal
        title={request?.title ?? ''}
        open={Boolean(request)}
        onClose={() => settle(isNotify)}
      >
        {request ? (
          <div className="confirm">
            <p className="confirm__message">{request.message}</p>

            {request.checkboxLabel ? (
              <label className="check-line confirm__check">
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={(event) => setTicked(event.target.checked)}
                />
                <span className="check-line__text">{request.checkboxLabel}</span>
              </label>
            ) : null}

            {request.copyText ? (
              <div className="confirm__value">
                <code>{request.copyText}</code>
                <button type="button" className="btn btn--tight" onClick={copy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : null}

            <div className="confirm__actions">
              {isNotify ? (
                <button type="button" className="btn btn--gold" onClick={() => settle(true)} autoFocus>
                  {request.closeLabel}
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => settle(false)}>
                    {request.cancelLabel}
                  </button>
                  <button
                    type="button"
                    className={request.tone === 'danger' ? 'btn btn--danger' : 'btn btn--gold'}
                    onClick={() => settle(true)}
                    autoFocus
                  >
                    {request.confirmLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  )
}
