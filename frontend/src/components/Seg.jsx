// A segmented control: the staff/parishioner switch on login, and the status filters on
// the request, announcement and calendar pages. Same sliding pill as the nav tabs.
//
// role="group" with an accessible name, not role="tablist" — these buttons filter a list
// in place, they do not switch between tab panels, and a screen reader announcing "tab 2
// of 3" would describe a structure that is not there. Each button keeps its own
// aria-pressed, which is set by the caller.

import useSlidingThumb from '../lib/useSlidingThumb.js'

export default function Seg({ label, children }) {
  const ref = useSlidingThumb()

  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      {children}
    </div>
  )
}
