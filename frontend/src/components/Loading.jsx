// The one way this app says "fetching". Before it, every page wrote its own sentence in
// a <p className="empty">, which meant a request in flight and a list that came back
// empty looked identical — the same centred grey line in the same place.
//
// role="status" with aria-live="polite" is the part that was missing everywhere: the app
// had no live region at all, so a screen reader was told nothing between submitting and
// the answer arriving.

export default function Loading({ label = 'Loading…', inline = false }) {
  return (
    <p className={inline ? 'loading loading--inline' : 'loading'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  )
}
