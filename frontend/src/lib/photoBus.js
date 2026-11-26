// Tells the top bar's Avatar that the signed-in account's own photo changed.

const EVENT = 'patron:photo'

export function announcePhotoChange() {
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // no window: nothing is listening either
  }
}

export function onPhotoChange(handler) {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
