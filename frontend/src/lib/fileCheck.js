// Pre-flight checks for a ledger photo, mirroring server/src/lib/fileType.js.

const SIGNATURES = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
]

export const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_PER_RECORD = 10

const ascii = (view, from, to) =>
  String.fromCharCode(...Array.from(view.slice(from, to)))

function sniff(view) {
  if (view.length < 12) return null
  for (const { type, bytes } of SIGNATURES) {
    if (bytes.every((byte, i) => view[i] === byte)) return type
  }
  if (ascii(view, 0, 4) === 'RIFF' && ascii(view, 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function checkPhoto(file, alreadyHeld = 0) {
  if (!file) return null

  if (alreadyHeld >= MAX_PER_RECORD) {
    return `This entry already has ${MAX_PER_RECORD} photos, which is the limit.`
  }
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > MAX_BYTES) {
    return `${file.name} is larger than 5 MB. Photograph the page at a lower resolution.`
  }

  let sniffed = null
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    sniffed = sniff(head)
  } catch {
    return null
  }

  if (!sniffed) {
    return `${file.name} is not a JPEG, PNG, WebP or PDF — its contents do not match any of those.`
  }

  return null
}

export async function checkIdFile(file) {
  if (!file) return null

  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > MAX_BYTES) {
    return `${file.name} is larger than 5 MB. Take the photo at a lower resolution, or scan the ID as a PDF.`
  }

  let sniffed = null
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    sniffed = sniff(head)
  } catch {
    return null
  }

  if (!sniffed) {
    return `${file.name} is not a JPEG, PNG, WebP or PDF — its contents do not match any of those.`
  }

  return null
}

export async function contentTypeFor(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    return sniff(head) ?? file.type
  } catch {
    return file.type
  }
}
