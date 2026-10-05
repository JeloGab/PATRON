import { isoOffset, weekdayOffset } from '../lib/dates.js'

export const PARISH = {
  name: 'Naga Metropolitan Cathedral',
  fullName: 'Metropolitan Cathedral and Parish of Saint John the Evangelist',
}

export const PRIEST = {
  name: 'Rev. Fr. Domingo R. Florida',
  email: 'priest@parish.org',
  password: 'parish',
}

const PRIESTS = [
  PRIEST.name,
  'Rev. Msgr. Noe Badiola, PC',
  'Rev. Fr. Wilfred Almoneda',
  'Rev. Fr. Lucien Banaag',
  'Rev. Fr. Romulo O. Castaneda',
]

export function seedBlocks() {
  return [
    {
      id: 'blk-1',
      date: isoOffset(4),
      time: '08:00',
      reason: 'Parish recollection',
    },
    {
      id: 'blk-2',
      date: isoOffset(15),
      time: '13:00',
      reason: 'Church maintenance',
    },
  ]
}

export function seedEvents() {
  const sunday = weekdayOffset(0)
  const wednesday = weekdayOffset(3)
  const saturday = weekdayOffset(6)

  return [
    {
      id: 'evt-seed-1',
      category: 'sacramental',
      title: 'Baptism of the Cruz family',
      sacrament: 'Baptism',
      priest: PRIESTS[0],
      date: isoOffset(-16),
      time: '09:00',
      participants: 28,
      status: 'Confirmed',
    },
    {
      id: 'evt-seed-2',
      category: 'sacramental',
      title: 'Funeral Mass for the Navarro family',
      sacrament: 'Funeral',
      priest: PRIESTS[4],
      date: isoOffset(-9),
      time: '08:30',
      participants: 90,
      status: 'Scheduled',
    },
    {
      id: 'evt-seed-3',
      category: 'sacramental',
      title: 'Sunday baptism',
      sacrament: 'Baptism',
      priest: PRIESTS[2],
      date: isoOffset(sunday),
      time: '10:00',
      participants: 24,
      status: 'Confirmed',
    },
    {
      id: 'evt-seed-4',
      category: 'sacramental',
      title: 'Confirmation rite',
      sacrament: 'Confirmation',
      priest: PRIESTS[1],
      date: isoOffset(wednesday),
      time: '15:00',
      participants: 62,
      status: 'Scheduled',
    },
    {
      id: 'evt-seed-5',
      category: 'sacramental',
      title: 'Santos and Reyes wedding',
      sacrament: 'Wedding',
      priest: PRIESTS[0],
      date: isoOffset(saturday),
      time: '14:00',
      participants: 150,
      status: 'Confirmed',
    },
    {
      id: 'evt-seed-6',
      category: 'sacramental',
      title: 'First Communion Mass',
      sacrament: 'First Communion',
      priest: PRIESTS[3],
      date: isoOffset(12),
      time: '09:30',
      participants: 48,
      status: 'Requirements',
      requirements: { met: 9, total: 12 },
    },
    {
      id: 'evt-seed-7',
      category: 'sacramental',
      title: 'Anointing at the parish clinic',
      sacrament: 'Anointing of the Sick',
      priest: PRIESTS[4],
      date: isoOffset(19),
      time: '08:00',
      participants: 12,
      status: 'Scheduled',
    },
    {
      id: 'evt-seed-8',
      category: 'general',
      title: 'Parish council meeting',
      sacrament: '',
      priest: '',
      date: isoOffset(6),
      time: '18:00',
      participants: null,
      status: 'Confirmed',
    },
    {
      id: 'evt-seed-9',
      category: 'seminar',
      title: 'Baptismal seminar',
      sacrament: '',
      priest: '',
      date: isoOffset(8),
      time: '09:00',
      participants: null,
      status: 'Scheduled',
    },
    {
      id: 'evt-seed-10',
      category: 'general',
      title: 'Choir practice',
      sacrament: '',
      priest: '',
      date: isoOffset(-11),
      time: '17:00',
      participants: null,
      status: 'Scheduled',
    },
  ]
}

export function seedApprovals() {
  return [
    {
      id: 'DOC-3092',
      applicant: 'Luis Gomez',
      document: 'Certificate of Marriage',
      date: isoOffset(-1),
      time: '11:40',
      status: 'For approval',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3090',
      applicant: 'Ana Cruz',
      document: 'Certificate of Baptism',
      date: isoOffset(-2),
      time: '09:15',
      status: 'For approval',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3088',
      applicant: 'Carmen Diaz',
      document: 'Good Moral / Parish Recommendation',
      date: isoOffset(-3),
      time: '10:20',
      status: 'For approval',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3079',
      applicant: 'Sofia Reyes',
      document: 'Certificate of Confirmation',
      date: isoOffset(-5),
      time: '14:05',
      status: 'Approved',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3072',
      applicant: 'Isabel Navarro',
      document: 'Certificate of First Communion',
      date: isoOffset(-8),
      time: '13:30',
      status: 'Approved',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3064',
      applicant: 'Juan Dela Cruz',
      document: 'Certificate of Baptism',
      date: isoOffset(-14),
      time: '16:00',
      status: 'Rejected',
      sentBy: 'Parish office',
    },
    {
      id: 'DOC-3058',
      applicant: 'Rosa Villanueva',
      document: 'Certificate of Baptism',
      date: isoOffset(-18),
      time: '08:45',
      status: 'Rejected',
      sentBy: 'Parish office',
    },
  ]
}
