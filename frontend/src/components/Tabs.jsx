// The nav tab strip. Exists only to own the sliding pill — the links themselves stay
// where they are, in TopNav, because each role's nav builds them differently.

import useSlidingThumb from '../lib/useSlidingThumb.js'

export default function Tabs({ label, children }) {
  const ref = useSlidingThumb()

  return (
    <nav className="tabs" aria-label={label} ref={ref}>
      {children}
    </nav>
  )
}
