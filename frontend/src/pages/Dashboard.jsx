import { Link, useLocation } from 'react-router-dom'
import EventTable from '../components/EventTable.jsx'
import { useEvents } from '../context/EventsContext.jsx'
import { useOffice } from '../context/OfficeContext.jsx'
import { PARISH, countRequirementsPending, countToVerify } from '../data/mock.js'
import { formatWeekRange, isThisWeek, isUpcomingEvent } from '../lib/dates.js'

export default function Dashboard() {
  const { events } = useEvents()
  const { applications, documents } = useOffice()
  const location = useLocation()
  const createdTitle = location.state?.createdTitle
  const upcoming = events.filter((event) => isUpcomingEvent(event))
  const weekCount = events.filter((event) => isThisWeek(event) && event.status !== 'Cancelled').length

  const metrics = [
    {
      label: 'Events this week',
      value: weekCount,
      hint: `Sun–Sat · ${formatWeekRange()}`,
      to: '/manager/schedule',
    },
    {
      label: 'Requests to verify',
      value: countToVerify(applications),
      hint: 'Sacrament applications waiting on review',
      to: '/manager/applications?focus=verify',
    },
    {
      label: 'Requirements pending',
      value: countRequirementsPending(applications),
      hint: 'Applications still missing papers',
      to: '/manager/applications?focus=requirements',
    },
    {
      label: 'Document requests',
      value: documents.length,
      hint: 'Certificates and recommendations',
      to: '/manager/documents',
    },
  ]

  return (
    <div className="page">
      <header className="page__hero">
        <div>
          <p className="eyebrow">Parish manager</p>
          <h1>Dashboard</h1>
          <p className="lede">
            {PARISH.fullName}. Review the office queue, then the coming schedule.
          </p>
        </div>
      </header>

      {createdTitle && (
        <p className="notice">
          <strong>{createdTitle}</strong> was added to the schedule.
        </p>
      )}

      <section className="metrics" aria-label="Office summary">
        {metrics.map((item) => (
          <Link key={item.label} to={item.to} className="metric">
            <p className="metric__label">{item.label}</p>
            <p className="metric__value">{item.value}</p>
            <p className="metric__hint">{item.hint}</p>
            <span className="metric__more">View</span>
          </Link>
        ))}
      </section>

      <section className="panel" aria-labelledby="upcoming-heading">
        <div className="panel__head">
          <div>
            <h2 id="upcoming-heading">Upcoming events</h2>
            <p className="muted panel__note">
              {upcoming.length === 1 ? '1 event' : `${upcoming.length} events`} from today onward
            </p>
          </div>
          <div className="panel__actions">
            <Link to="/manager/schedule" className="btn btn--ghost">
              Open calendar
            </Link>
            <Link to="/manager/events/new" className="btn btn--gold">
              Create event
            </Link>
          </div>
        </div>

        <EventTable events={upcoming} empty="No upcoming events on the schedule." />
      </section>
    </div>
  )
}
