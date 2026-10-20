// The whole-area empty state; for one line inside a panel use <p className="empty">.

export default function Empty({ title, hint, children }) {
  return (
    <div className="card empty-card">
      <p className="empty-card__title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </div>
  )
}
