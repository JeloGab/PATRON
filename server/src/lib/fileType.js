const SIGNATURES = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
]

const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const ATTACHMENT_TYPES = Object.keys(EXTENSION)
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024


export function sniffContentType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null

  for (const { type, bytes } of SIGNATURES) {
    if (bytes.every((byte, i) => buffer[i] === byte)) return type
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

export function sanitizeFileName(value, contentType) {
  const raw = String(value ?? '')
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }

  const base = decoded.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')                 
    .replace(/[\u0300-\u036f]/g, '')   
    .replace(/[^\w.\- ]/g, '')        
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return cleaned || `ledger.${EXTENSION[contentType] ?? 'bin'}`
}