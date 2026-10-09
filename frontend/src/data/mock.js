import { isoOffset, weekdayOffset } from '../lib/dates.js'

export const PARISH = {
  name: 'Naga Metropolitan Cathedral',
  fullName: 'Metropolitan Cathedral and Parish of Saint John the Evangelist',
}

export const SACRAMENTS = [
  'Wedding',
  'Baptism',
  'Confirmation',
  'First Communion',
  'Confession',
  'Anointing of the Sick',
  'Funeral',
]

export const PRIESTS = [
  'Rev. Fr. Domingo R. Florida',
  'Rev. Msgr. Noe Badiola, PC',
  'Rev. Fr. Wilfred Almoneda',
  'Rev. Fr. Lucien Banaag',
  'Rev. Fr. Romulo O. Castaneda',
]

export const MANAGER_NAME = 'Parish office'

export const applications = [
  {
    id: 'APP-1048',
    title: 'Baptism of Ana Cruz',
    date: isoOffset(5),
    time: '09:00',
    sacrament: 'Baptism',
    priest: PRIESTS[0],
    participants: 24,
    status: 'Pending',
    requirements: [
      { id: 'APP-1048-1', label: 'Birth certificate', checked: true },
      { id: 'APP-1048-2', label: 'Parents’ valid IDs', checked: true },
      { id: 'APP-1048-3', label: 'Godparent confirmation', checked: false },
    ],
  },
  {
    id: 'APP-1047',
    title: 'Wedding of Luis and Maria Gomez',
    date: isoOffset(18),
    time: '14:00',
    sacrament: 'Wedding',
    priest: PRIESTS[1],
    participants: 140,
    status: 'Pending',
    requirements: [
      { id: 'APP-1047-1', label: 'Baptismal certificates', checked: true },
      { id: 'APP-1047-2', label: 'Confirmation certificates', checked: true },
      { id: 'APP-1047-3', label: 'Marriage license', checked: false },
      { id: 'APP-1047-4', label: 'Canonical interview', checked: false },
      { id: 'APP-1047-5', label: 'Pre-marriage seminar', checked: true },
    ],
  },
  {
    id: 'APP-1046',
    title: 'First Communion of Sofia Reyes',
    date: isoOffset(11),
    time: '09:30',
    sacrament: 'First Communion',
    priest: PRIESTS[3],
    participants: 40,
    status: 'Complete',
    requirements: [
      { id: 'APP-1046-1', label: 'Baptismal certificate', checked: true },
      { id: 'APP-1046-2', label: 'Catechism attendance', checked: true },
    ],
  },
  {
    id: 'APP-1045',
    title: 'Confirmation of Carmen Diaz',
    date: isoOffset(9),
    time: '15:00',
    sacrament: 'Confirmation',
    priest: PRIESTS[2],
    participants: 60,
    status: 'Pending',
    requirements: [
      { id: 'APP-1045-1', label: 'Baptismal certificate', checked: true },
      { id: 'APP-1045-2', label: 'Sponsor letter', checked: false },
    ],
  },
  {
    id: 'APP-1043',
    title: 'Baptism of Juan Dela Cruz',
    date: isoOffset(-12),
    time: '10:00',
    sacrament: 'Baptism',
    priest: PRIESTS[4],
    participants: 18,
    status: 'Complete',
    requirements: [
      { id: 'APP-1043-1', label: 'Birth certificate', checked: true },
      { id: 'APP-1043-2', label: 'Parents’ valid IDs', checked: true },
    ],
  },
]

export const records = [
  {
    id: 'REC-2026-0184',
    sacrament: 'Baptism',
    subjects: 'Ana Cruz',
    date: isoOffset(-20),
    officiant: PRIESTS[0],
    encodedBy: MANAGER_NAME,
  },
  {
    id: 'REC-2026-0171',
    sacrament: 'Wedding',
    subjects: 'Santos and Reyes',
    date: isoOffset(-30),
    officiant: PRIESTS[1],
    encodedBy: MANAGER_NAME,
  },
  {
    id: 'REC-2026-0166',
    sacrament: 'Confirmation',
    subjects: 'Miguel Torres',
    date: isoOffset(-40),
    officiant: PRIESTS[2],
    encodedBy: MANAGER_NAME,
  },
  {
    id: 'REC-2026-0152',
    sacrament: 'First Communion',
    subjects: 'Isabel Navarro',
    date: isoOffset(-55),
    officiant: PRIESTS[3],
    encodedBy: MANAGER_NAME,
  },
  {
    id: 'REC-2025-0418',
    sacrament: 'Baptism',
    subjects: 'Rosa Villanueva',
    date: isoOffset(-80),
    officiant: PRIESTS[4],
    encodedBy: MANAGER_NAME,
  },
  {
    id: 'REC-2024-0902',
    sacrament: 'Wedding',
    subjects: 'Luis Gomez and Maria Santos',
    date: isoOffset(-400),
    officiant: PRIESTS[1],
    encodedBy: MANAGER_NAME,
  },
]

export const DOCUMENT_TYPES = [
  'Certificate of Baptism',
  'Certificate of Marriage',
  'Certificate of Confirmation',
  'Certificate of First Communion',
  'Good Moral / Parish Recommendation',
]

export const documentRequests = [
  {
    id: 'DOC-3088',
    applicant: 'Ana Cruz',
    document: 'Certificate of Baptism',
    date: isoOffset(-1),
    time: '09:15',
    status: 'For verification',
    matchedRecordId: null,
  },
  {
    id: 'DOC-3084',
    applicant: 'Luis Gomez',
    document: 'Certificate of Marriage',
    date: isoOffset(-2),
    time: '11:40',
    status: 'For approval',
    matchedRecordId: null,
  },
  {
    id: 'DOC-3079',
    applicant: 'Sofia Reyes',
    document: 'Certificate of Confirmation',
    date: isoOffset(-5),
    time: '14:05',
    status: 'Approved',
    matchedRecordId: null,
  },
  {
    id: 'DOC-3071',
    applicant: 'Carmen Diaz',
    document: 'Good Moral / Parish Recommendation',
    date: isoOffset(-7),
    time: '10:20',
    status: 'For verification',
    matchedRecordId: null,
  },
  {
    id: 'DOC-3064',
    applicant: 'Juan Dela Cruz',
    document: 'Certificate of Baptism',
    date: isoOffset(-14),
    time: '16:00',
    status: 'Rejected',
    matchedRecordId: null,
  },
]

export const announcements = [
  {
    id: 'ann-1',
    title: 'Baptismal seminar this week',
    date: isoOffset(0),
    body: 'Parents and godparents are asked to attend the seminar before the next baptism schedule. The parish office will confirm each family’s slot.',
    createdBy: MANAGER_NAME,
    status: 'Published',
    facebookSynced: true,
  },
  {
    id: 'ann-2',
    title: 'Wedding document checklist',
    date: isoOffset(-2),
    body: 'Couples with a wedding on the calendar should submit canonical interview papers and baptismal certificates at least one month before the rite.',
    createdBy: MANAGER_NAME,
    status: 'For approval',
    facebookSynced: false,
  },
  {
    id: 'ann-3',
    title: 'Certificate releasing hours',
    date: isoOffset(-6),
    body: 'Approved document requests can be claimed at the parish office on weekdays, from 8:00 AM to 4:00 PM.',
    createdBy: MANAGER_NAME,
    status: 'Published',
    facebookSynced: true,
  },
]

export function countToVerify(list = applications) {
  return list.filter((item) => item.status === 'Pending').length
}

export function countRequirementsPending(list = applications) {
  return list.filter((item) => item.requirements.some((requirement) => !requirement.checked)).length
}

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
