// A segmented control: the login switch and the status filters, on the sliding pill.

import useSlidingThumb from '../lib/useSlidingThumb.js'

export default function Seg({ label, children }) {
  const ref = useSlidingThumb()

  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      {children}
    </div>
  )
}
