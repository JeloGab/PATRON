import { Link, useParams } from 'react-router-dom'
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
        <div className="detail__banner" style={{ '--accent': church.accent }}>
          <div className="detail__banner-shade">
            <p className="eyebrow eyebrow--light">{church.diocese}</p>
            <h1>{church.name}</h1>
            <p>{church.city}</p>
          </div>
        </div>

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
                <dt>Parish priest</dt>
                <dd>{church.priest}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{church.address}</dd>
              </div>
            </dl>
          </section>

          <aside className="stack">
            <section className="card">
              <p className="eyebrow">Office</p>
              <p>
                <a href={`tel:${church.phone.replace(/\s/g, '')}`}>{church.phone}</a>
              </p>
              <p>
                <a href={`mailto:${church.email}`}>{church.email}</a>
              </p>
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
        </section>
      </article>
    </div>
  )
}
