// Placeholders in the shape of the content that is coming, instead of a spinner.

const DEFAULTS = { lines: 3, cards: 6, rows: 4, table: 5, form: 5, media: 1 }

function Line({ width = '100%', tall = false }) {
  return <span className={`skeleton skel__line${tall ? ' skel__line--tall' : ''}`} style={{ width }} />
}

function Cards({ count }) {
  return (
    <ul className="grid skel__grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card skel__card">
          <span className="skeleton skel__thumb" />
          <Line width="70%" tall />
          <Line width="92%" />
          <Line width="45%" />
        </li>
      ))}
    </ul>
  )
}

function Rows({ count }) {
  return (
    <ul className="priest-list skel__list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card skel__rowcard">
          <Line width="42%" tall />
          <Line width="78%" />
          <Line width="30%" />
        </li>
      ))}
    </ul>
  )
}

function Table({ count }) {
  return (
    <div className="panel skel__panel" aria-hidden="true">
      <div className="skel__row skel__row--head">
        <Line width="28%" />
        <Line width="18%" />
        <Line width="22%" />
        <Line width="14%" />
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel__row">
          <Line width="40%" />
          <Line width="24%" />
          <Line width="32%" />
          <Line width="18%" />
        </div>
      ))}
    </div>
  )
}

function Calendar() {
  return (
    <div className="cal skel__cal" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={`w${i}`} className="cal__weekday">
          <Line width="60%" />
        </div>
      ))}
      {Array.from({ length: 35 }, (_, i) => (
        <div key={i} className="skeleton skel__cell" />
      ))}
    </div>
  )
}

function Form({ count }) {
  return (
    <div className="skel__form" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel__field">
          <Line width="35%" />
          <span className="skeleton skel__input" />
        </div>
      ))}
    </div>
  )
}

function Detail() {
  return (
    <div className="skel__detail" aria-hidden="true">
      <span className="skeleton skel__banner" />
      <Line width="45%" tall />
      <Line width="88%" />
      <Line width="76%" />
      <div className="skel__row">
        <Line width="30%" />
        <Line width="30%" />
        <Line width="30%" />
      </div>
    </div>
  )
}

function Media({ count }) {
  return (
    <div className="skel__media" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="skeleton skel__frame" />
      ))}
    </div>
  )
}

function Lines({ count }) {
  return (
    <div className="skel__lines" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Line key={i} width={i === count - 1 ? '55%' : '100%'} />
      ))}
    </div>
  )
}

export default function Skeleton({ variant = 'lines', count, label = 'Loading…' }) {
  const n = count ?? DEFAULTS[variant] ?? 3

  return (
    <div className="skel" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {variant === 'cards' && <Cards count={n} />}
      {variant === 'rows' && <Rows count={n} />}
      {variant === 'table' && <Table count={n} />}
      {variant === 'calendar' && <Calendar />}
      {variant === 'form' && <Form count={n} />}
      {variant === 'detail' && <Detail />}
      {variant === 'media' && <Media count={n} />}
      {variant === 'lines' && <Lines count={n} />}
    </div>
  )
}
