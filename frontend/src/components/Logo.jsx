export default function Logo({ light = false, compact = false }) {
  return (
    <span className={`brand ${light ? 'brand--light' : ''} ${compact ? 'brand--compact' : ''}`}>
      <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M20 7.5v25M12 16.2h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="20" cy="16.2" r="1.6" fill="currentColor" />
      </svg>
      <span className="brand__text">
        <span className="brand__name">PATRON</span>
        {!compact && <span className="brand__tag">System administration</span>}
      </span>
    </span>
  )
}
