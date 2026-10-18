import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export default function useSlidingThumb() {
  const ref = useRef(null)

  const measure = useCallback(() => {
    const host = ref.current
    if (!host) return

    const active = host.querySelector('.is-active')
    if (!active) {
      host.style.setProperty('--thumb-o', '0')
      return
    }

    
    const box = host.getBoundingClientRect()
    const item = active.getBoundingClientRect()

    host.style.setProperty('--thumb-x', `${item.left - box.left}px`)
    host.style.setProperty('--thumb-y', `${item.top - box.top}px`)
    host.style.setProperty('--thumb-w', `${item.width}px`)
    host.style.setProperty('--thumb-h', `${item.height}px`)
    host.style.setProperty('--thumb-o', '1')
    host.classList.add('has-thumb')
  }, [])

  
  useLayoutEffect(measure)

  useEffect(() => {
    const host = ref.current
    if (!host) return undefined

    const observer = new ResizeObserver(measure)
    observer.observe(host)
    for (const child of host.children) observer.observe(child)

    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure).catch(() => {})

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  return ref
}
