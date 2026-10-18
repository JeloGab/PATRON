// "There is nothing here", when it fills a whole content area rather than one line of a
// panel. Renders the .empty-card shape that already existed but was only used in two
// places, so emptiness reads as a state the page is in and not as a page that failed to
// load.
//
// For a single line inside a panel that has other content, keep using
// <p className="empty">…</p> — this is the whole-area case.

export default function Empty({ title, hint, children }) {
  return (
    <div className="card empty-card">
      <p className="empty-card__title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </div>
  )
}
