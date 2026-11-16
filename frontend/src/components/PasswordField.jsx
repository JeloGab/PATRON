import { useEffect, useState } from 'react'

function EyeIcon({ crossed }) {
  return (
    <svg className="pw__icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M1.6 10S4.9 4.8 10 4.8 18.4 10 18.4 10 15.1 15.2 10 15.2 1.6 10 1.6 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {crossed ? (
        <path d="M3.4 3.4l13.2 13.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      ) : null}
    </svg>
  )
}

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  hint = null,
  required = true,
  hideOn = null,
  ...rest
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (hideOn) setShown(false)
  }, [hideOn])

  return (
    <label className="field field--full">
      <span>
        {label}
        {required ? <b className="req">*</b> : null}
      </span>
      <div className="pw">
        <input
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...rest}
        />
        <button
          type="button"
          className="pw__toggle"
          onClick={() => setShown((on) => !on)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          title={shown ? 'Hide password' : 'Show password'}
        >
          <EyeIcon crossed={shown} />
        </button>
      </div>
      {hint ? <span className="form-hint">{hint}</span> : null}
    </label>
  )
}
