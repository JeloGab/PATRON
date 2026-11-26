// Cards fade and rise as they scroll into view. Public pages only.

import { useEffect, useRef } from 'react'

const SELECTOR = '.card, .parish-card'
const MAX_STEP = 5

export default function useReveal(deps = []) {
  const ref = useRef(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return undefined
    if (!('IntersectionObserver' in window)) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    host.classList.add('is-armed')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
    )

    const counts = new Map()
    for (const card of host.querySelectorAll(SELECTOR)) {
      if (card.classList.contains('is-in')) continue

      if (!card.classList.contains('reveal')) {
        const step = counts.get(card.parentElement) ?? 0
        counts.set(card.parentElement, step + 1)
        card.style.setProperty('--i', String(Math.min(step, MAX_STEP)))
        card.classList.add('reveal')
      }

      io.observe(card)
    }

    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
