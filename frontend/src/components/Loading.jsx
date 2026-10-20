// The one way this app says "fetching" — a polite live region, not a bare grey line.

export default function Loading({ label = 'Loading…', inline = false }) {
  return (
    <p className={inline ? 'loading loading--inline' : 'loading'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  )
}
