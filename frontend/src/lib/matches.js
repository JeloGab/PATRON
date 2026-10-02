const STOP = new Set(['and', 'of', 'the'])

const DOCUMENT_SACRAMENT = {
  'Certificate of Baptism': 'Baptism',
  'Certificate of Marriage': 'Wedding',
  'Certificate of Confirmation': 'Confirmation',
  'Certificate of First Communion': 'First Communion',
}

function tokens(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token))
}

export function matchPercent(request, record) {
  const applicant = request.applicant.trim().toLowerCase()
  const subjects = record.subjects.toLowerCase()
  const expected = DOCUMENT_SACRAMENT[request.document]
  const sacramentOk = !expected || record.sacrament === expected
  const applicantTokens = tokens(request.applicant)
  const subjectTokens = tokens(record.subjects)
  if (!applicantTokens.length || !subjectTokens.length) return 0

  if (sacramentOk && subjects.trim() === applicant) return 100
  if (sacramentOk && subjects.includes(applicant)) return 90

  const hits = applicantTokens.filter((token) => subjectTokens.includes(token)).length
  const ratio = hits / applicantTokens.length
  if (!sacramentOk) return Math.round(ratio * 40)
  return Math.round(ratio * 100)
}

export function findBestMatch(request, records) {
  let best = null
  for (const record of records) {
    const percent = matchPercent(request, record)
    if (!best || percent > best.percent) best = { record, percent }
  }
  if (!best || best.percent < 60) return null
  return best
}
