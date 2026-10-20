// The nav tab strip. Exists only to own the sliding pill; the links live in TopNav.

import useSlidingThumb from '../lib/useSlidingThumb.js'

export default function Tabs({ label, children }) {
  const ref = useSlidingThumb()

  return (
    <nav className="tabs" aria-label={label} ref={ref}>
      {children}
    </nav>
  )
}
