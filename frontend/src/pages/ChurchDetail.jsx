import { Link, useParams } from 'react-router-dom'
import ChurchMedia from '../components/ChurchMedia.jsx'
import { churches } from '../data/mock.js'

export default function ChurchDetail() {
  const { id } = useParams()
  const church = churches.find((item) => item.id === id)

  if (!church) {
    return (
      <div className="page">
        <p className="empty">This parish is not in the directory.</p>
        <Link to="/" className="btn btn--gold">
          Back to parishes
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/" className="back">
        ← All parishes
      </Link>

      <article className="detail">
        <ChurchMedia
          id={church.id}
          accent={church.accent}
          className="detail__banner"
          alt={church.name}
        >
          <div className="detail__banner-shade">
            <p className="eyebrow eyebrow--light">{church.diocese}</p>
            <h1>{church.name}</h1>
            <p>
              {church.vicariate} · {church.city}
            </p>
          </div>
        </ChurchMedia>

        <div className="detail__grid">
          <section className="card">
            <p className="eyebrow">About this parish</p>
            <p className="lede">{church.summary}</p>
            <dl className="facts">
              <div>
                <dt>Patron</dt>
                <dd>{church.patron}</dd>
              </div>
              <div>
                <dt>Founded</dt>
                <dd>{church.founded}</dd>
              </div>
              <div>
                <dt>{church.priestTitle || 'Parish priest'}</dt>
                <dd>
                  {church.priest}
                  {church.priestNote && <p className="muted fact-note">{church.priestNote}</p>}
                </dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{church.address}</dd>
              </div>
              <div>
                <dt>Vicariate / area</dt>
                <dd>{church.vicariate}</dd>
              </div>
            </dl>
          </section>

          <aside className="stack">
            <section className="card cta-card">
              <p className="eyebrow">Online issuance</p>
              <h2 className="cta-card__title">Request a document</h2>
              <p className="muted">
                Apply for a baptismal, confirmation, marriage, or related parish certificate. Your
                request starts as pending until the parish manager approves it.
              </p>
              <Link to={`/parish/${church.id}/request`} className="btn btn--gold btn--block">
                Open application form
              </Link>
            </section>

            <section className="card">
              <p className="eyebrow">Office</p>
              {church.phone ? (
                <p>
                  <a href={`tel:${church.phone.replace(/[^\d+]/g, '')}`}>{church.phone}</a>
                </p>
              ) : (
                <p className="muted">No phone listed</p>
              )}
              {church.mobile && (
                <p>
                  Mobile:{' '}
                  <a href={`tel:${church.mobile.replace(/[^\d+]/g, '')}`}>{church.mobile}</a>
                </p>
              )}
              {church.email ? (
                <p>
                  <a href={`mailto:${church.email}`}>{church.email}</a>
                </p>
              ) : (
                <p className="muted">No email listed</p>
              )}
              {church.officeHours && (
                <p className="muted">Hours: {church.officeHours}</p>
              )}
            </section>

            <section className="card">
              <p className="eyebrow">Sacraments offered</p>
              <ul className="pills">
                {church.sacraments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <section className="card">
          <p className="eyebrow">Mass schedule</p>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Times</th>
              </tr>
            </thead>
            <tbody>
              {church.masses.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>{row.times}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {church.scheduleNote && <p className="schedule-note muted">{church.scheduleNote}</p>}
        </section>
      </article>
    </div>
  )
}
