const CLASS_BY_STATUS = {
  Scheduled: 'status-pill--scheduled',
  Confirmed: 'status-pill--confirmed',
  Approved: 'status-pill--approved',
  'For approval': 'status-pill--pending',
  Rejected: 'status-pill--rejected',
}

export default function StatusPill({ status }) {
  const tone =
    typeof status === 'string' && status.startsWith('Requirements')
      ? 'status-pill--requirements'
      : CLASS_BY_STATUS[status] || ''
  return <span className={`status-pill ${tone}`}>{status}</span>
}
