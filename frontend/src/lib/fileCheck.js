// Pre-flight checks for a ledger photo, mirroring server/src/lib/fileType.js.
//
// The SERVER is authoritative: it sniffs the bytes and ignores anything the client
// claims, so nothing here is a security boundary. This exists for one reason, from
// `records_summary.md` §5.1 step 1 — "a bad file never causes a record to be
// created". Encoding an entry with a photo is two requests by design, and checking
// the file before the first one means the second rarely fails.
//
// The signatures are duplicated from the server, which is a rule written twice. The
// cost is accepted because the two serve different purposes and the server wins any
// disagreement: a file this misses is still refused, it just wastes a round trip.

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

// Returns the sniffed MIME type, or null. WebP is checked separately because its
// signature is non-contiguous — `RIFF` at bytes 0-3, `WEBP` at 8-11 — which the flat
// byte-prefix comparison cannot express. The server does the same.
function sniff(view) {
  if (view.length < 12) return null
  for (const { type, bytes } of SIGNATURES) {
    if (bytes.every((byte, i) => view[i] === byte)) return type
  }
  if (ascii(view, 0, 4) === 'RIFF' && ascii(view, 8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Returns an error message, or null when the file is acceptable.
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
    // Reading the slice can fail if the file moved or a permission was revoked
    // between picking and reading. Let the server decide rather than guess.
    return null
  }

  if (!sniffed) {
    return `${file.name} is not a JPEG, PNG, WebP or PDF — its contents do not match any of those.`
  }
  // The bytes, not file.type, which comes from the OS and can be wrong or empty.
  return null
}

// What to send as Content-Type. The declared type decides whether express.raw parses
// the body at all, so a browser that reports '' for a known-good file would otherwise
// have its upload rejected before it is sniffed.
export async function contentTypeFor(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    return sniff(head) ?? file.type
  } catch {
    return file.type
  }
}
