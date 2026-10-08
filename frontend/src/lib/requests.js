const KEY = 'patron.requests'

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function getRequests(email) {
  const all = readAll()
  if (!email) return all
  return all.filter((item) => item.requesterEmail === email)
}

export function getRequestById(id) {
  return readAll().find((item) => item.id === id) || null
}

export function createRequest(payload) {
  const all = readAll()
  const request = {
    id: `REQ-${Date.now().toString(36).toUpperCase()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  }
  all.unshift(request)
  writeAll(all)
  return request
}

export const DOCUMENT_TYPES = [
  'Certificate of Baptism',
  'Certificate of Confirmation',
  'Certificate of Marriage',
  'Certificate of Death',
  'Good Moral / Parish Recommendation',
]
