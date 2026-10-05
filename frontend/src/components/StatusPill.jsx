const CLASS_BY_STATUS = {
  Scheduled: 'status-pill--scheduled',
  Confirmed: 'status-pill--confirmed',
  Completed: 'status-pill--done',
  Cancelled: 'status-pill--rejected',
  'To verify': 'status-pill--pending',
  'In review': 'status-pill--review',
  Approved: 'status-pill--approved',
  Pending: 'status-pill--pending',
  Complete: 'status-pill--approved',
  Ready: 'status-pill--review',
  Released: 'status-pill--done',
  Published: 'status-pill--approved',
  'For approval': 'status-pill--pending',
  'For verification': 'status-pill--review',
  Rejected: 'status-pill--rejected',
}

export default function StatusPill({ status }) {
  const tone =
    typeof status === 'string' && status.startsWith('Requirements')
      ? 'status-pill--requirements'
      : CLASS_BY_STATUS[status] || ''
  return <span className={`status-pill ${tone}`}>{status}</span>
}
