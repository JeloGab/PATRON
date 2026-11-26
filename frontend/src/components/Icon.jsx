// Line icons drawn inline; stroke is currentColor and the size follows font-size.

const PATHS = {
  shield: (
    <>
      <path d="M12 21s7-3.3 7-9V5.6L12 3 5 5.6V12c0 5.7 7 9 7 9z" />
      <path d="M12 8v6" />
      <path d="M9.6 10.4h4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9.2" cy="8.2" r="3.2" />
      <path d="M3.2 20a6 6 0 0112 0" />
      <path d="M16 5.6a3.2 3.2 0 010 5.6" />
      <path d="M17.6 14.2A6 6 0 0120.8 18.4" />
    </>
  ),
  certificate: (
    <>
      <path d="M19 13V4.5A1.5 1.5 0 0017.5 3h-11A1.5 1.5 0 005 4.5v15A1.5 1.5 0 006.5 21h5" />
      <path d="M8 7.6h8" />
      <path d="M8 11h8" />
      <path d="M8 14.4h3" />
      <circle cx="17" cy="16.8" r="3" />
      <path d="M15.2 19.2L14.4 22l2.6-1.2 2.6 1.2-.8-2.8" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A1.5 1.5 0 015.5 3H19.5v18H5.5A1.5 1.5 0 014 19.5z" />
      <path d="M8 3v18" />
      <path d="M11.4 8.4h4.8" />
      <path d="M11.4 12h4.8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.6" width="18" height="14.8" rx="2" />
      <circle cx="8.6" cy="10" r="1.8" />
      <path d="M3.6 17.6l4.8-4.4 4 3.4 3-2.4 5 3.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.6 2.2" />
    </>
  ),
  church: (
    <>
      <path d="M12 2v3.2" />
      <path d="M10.4 3.6h3.2" />
      <path d="M12 6l-6 4.4V21h12V10.4L12 6z" />
      <path d="M10.4 21v-4.6a1.6 1.6 0 013.2 0V21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  cross: (
    <>
      <path d="M12 3v18" />
      <path d="M6.6 8.4h10.8" />
    </>
  ),
  hourglass: <path d="M7 3h10v3.6L12 12l5 5.4V21H7v-3.6L12 12 7 6.6z" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  portrait: (
    <>
      <circle cx="12" cy="8.6" r="3.6" />
      <path d="M4.6 20.4a7.4 7.4 0 0114.8 0" />
    </>
  ),
  trash: (
    <>
      <path d="M4.6 7h14.8" />
      <path d="M9.6 7V4.6h4.8V7" />
      <path d="M6.6 7l.9 12.1A1.5 1.5 0 009 20.5h6a1.5 1.5 0 001.5-1.4L17.4 7" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16.2V4" />
      <path d="M7.6 8.4L12 4l4.4 4.4" />
      <path d="M4 14.8v3.7A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5v-3.7" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.6 7.2l8.4 5.8 8.4-5.8" />
    </>
  ),
  phone: (
    <path d="M15.6 21A13.6 13.6 0 013 8.4a2 2 0 011.9-2l2-.5a1.6 1.6 0 011.8.9l1 2.2a1.6 1.6 0 01-.5 1.9l-1 .8a9.6 9.6 0 004.2 4.2l.8-1a1.6 1.6 0 011.9-.5l2.2 1a1.6 1.6 0 01.9 1.8l-.5 2A2 2 0 0115.6 21z" />
  ),
  pin: (
    <>
      <path d="M12 21.2s7-5.6 7-11.2a7 7 0 10-14 0c0 5.6 7 11.2 7 11.2z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
}

export default function Icon({ name, className = '', title }) {
  const art = PATHS[name]
  if (!art) return null

  return (
    <svg
      className={`ico ${className}`.trim()}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {art}
    </svg>
  )
}
