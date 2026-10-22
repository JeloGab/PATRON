import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const BLUE = '#1f3a93'
const GOLD = '#c9a227'
const INK = '#1a1a1a'
const MUTED = '#5b5b5b'

const PAGE_W = 842
const PAGE_H = 595
const LEFT = 56
const RIGHT = 786
const BODY_W = RIGHT - LEFT

const TITLES = {
  baptism: 'Certificate of Baptism',
  confirmation: 'Certificate of Confirmation',
  marriage: 'Certificate of Marriage',
  death: 'Certificate of Death',
}
const PREDICATES = {
  baptism: 'has been baptized in this parish',
  confirmation: 'has been confirmed in this parish',
  marriage: 'have been united in the Sacrament of Matrimony in this parish',
  death: 'has been recorded in the register of deaths of this parish',
}

function longDate(ymd) {
  if (!ymd) return null
  const [year, month, day] = String(ymd).split('-').map(Number)
  if (!year || !month || !day) return String(ymd)
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function fitSize(doc, text, font, width, max, min) {
  doc.font(font)
  let size = max
  while (size > min) {
    doc.fontSize(size)
    if (doc.heightOfString(String(text), { width }) <= size * 1.35) return size
    size -= 0.5
  }
  return min
}

function caption(doc, label, x, y, width, align = 'center') {
  doc.font('Helvetica').fontSize(7).fillColor(MUTED)
    .text(String(label).toUpperCase(), x, y, { width, align, characterSpacing: 0.8, lineBreak: false })
}

function field(doc, label, value, x, y, width, align = 'center') {
  if (!value) return
  caption(doc, label, x, y, width, align)
  const size = fitSize(doc, value, 'Times-Roman', width, 11, 7.5)
  doc.font('Times-Roman').fontSize(size).fillColor(INK)
    .text(String(value), x, y + 11 + (11 - size) / 2, { width, align, height: 13, ellipsis: true, lineBreak: false })
}

function wideField(doc, label, value, x, y, width, align = 'center') {
  if (!value) return
  caption(doc, label, x, y, width, align)
  doc.font('Times-Roman').fontSize(10.5).fillColor(INK)
    .text(String(value), x, y + 11, { width, align, height: 26, ellipsis: true })
}

function rule(doc, x1, y, x2, options = {}) {
  doc.moveTo(x1, y).lineTo(x2, y)
    .lineWidth(options.weight ?? 0.6)
    .strokeColor(options.color ?? GOLD)
    .stroke()
}

export async function buildCertificatePdf({ certificate, signature = null, verifyUrl }) {
  const snapshot = certificate.snapshot ?? {}
  const people = snapshot.subjects ?? []
  const type = snapshot.recordType
  const title = TITLES[type] ?? certificate.documentName ?? 'Parish Certificate'
  const predicate = PREDICATES[type] ?? 'is recorded in the register of this parish'
  const isMarriage = people.length >= 2
  const qr = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 300 })

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: {
      Title: title + ' - ' + (snapshot.subjectName ?? ''),
      Author: snapshot.parishName,
      Subject: 'Verification code ' + certificate.verificationCode,
    },
  })

  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.rect(24, 24, PAGE_W - 48, PAGE_H - 48).lineWidth(2).strokeColor(GOLD).stroke()
  doc.rect(30, 30, PAGE_W - 60, PAGE_H - 60).lineWidth(0.5).strokeColor(GOLD).stroke()

  const parishSize = fitSize(doc, snapshot.parishName ?? '', 'Times-Bold', BODY_W, 17, 11)
  doc.font('Times-Bold').fontSize(parishSize).fillColor(BLUE)
    .text(snapshot.parishName ?? '', LEFT, 50, { width: BODY_W, align: 'center', lineBreak: false })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text(snapshot.parishAddress ?? '', LEFT, 74, { width: BODY_W, align: 'center', height: 11, ellipsis: true })
  if (snapshot.parishContact) {
    doc.text(snapshot.parishContact, LEFT, 86, { width: BODY_W, align: 'center', height: 11, ellipsis: true })
  }

  rule(doc, LEFT, 104, RIGHT, { weight: 1.2 })

  const titleText = title.toUpperCase()
  const titleSize = fitSize(doc, titleText + '   ', 'Times-Bold', BODY_W, 28, 19)
  doc.font('Times-Bold').fontSize(titleSize).fillColor(INK)
    .text(titleText, LEFT, 116, { width: BODY_W, align: 'center', characterSpacing: 3, lineBreak: false })

  rule(doc, 371, 156, 471, { weight: 0.8 })

  doc.font('Times-Italic').fontSize(11).fillColor(MUTED)
    .text('This is to certify that', LEFT, 170, { width: BODY_W, align: 'center' })

  const names = isMarriage
    ? people.slice(0, 2).map((p) => p.fullName).filter(Boolean).join('   and   ')
    : (people[0]?.fullName ?? '')
  const nameSize = fitSize(doc, names, 'Times-Bold', BODY_W, isMarriage ? 22 : 26, 12)
  doc.font('Times-Bold').fontSize(nameSize).fillColor(BLUE)
    .text(names, LEFT, 186, { width: BODY_W, align: 'center', lineBreak: false })

  doc.font('Times-Italic').fontSize(12).fillColor(INK)
    .text(predicate, LEFT, 186 + nameSize + 8, { width: BODY_W, align: 'center' })

  rule(doc, 241, 246, 601, { weight: 0.4 })

  const PARENTS_Y = 258
  if (isMarriage) {
    const colW = BODY_W / 4
    const [groom, bride] = people
    field(doc, "Groom's father", groom?.fatherName, LEFT, PARENTS_Y, colW - 12)
    field(doc, "Groom's mother", groom?.motherName, LEFT + colW, PARENTS_Y, colW - 12)
    field(doc, "Bride's father", bride?.fatherName, LEFT + colW * 2, PARENTS_Y, colW - 12)
    field(doc, "Bride's mother", bride?.motherName, LEFT + colW * 3, PARENTS_Y, colW - 12)
    const witnesses = people.map((p) => p.sponsorNames).filter(Boolean).join('; ')
    field(doc, 'Witnesses', witnesses, LEFT, PARENTS_Y + 34, BODY_W)
  } else {
    const person = people[0] ?? {}
    const colW = BODY_W / 3
    field(doc, 'Father', person.fatherName, LEFT, PARENTS_Y, colW - 16)
    field(doc, 'Mother', person.motherName, LEFT + colW, PARENTS_Y, colW - 16)
    wideField(doc, 'Sponsors', person.sponsorNames, LEFT + colW * 2, PARENTS_Y, colW - 16)
  }

  const person = people[0] ?? {}
  const band = isMarriage
    ? [
      ["Groom's date of birth", longDate(people[0]?.dateOfBirth)],
      ["Groom's place of birth", people[0]?.placeOfBirth],
      ["Bride's date of birth", longDate(people[1]?.dateOfBirth)],
      ["Bride's place of birth", people[1]?.placeOfBirth],
      ['Date of the record', longDate(snapshot.recordDate)],
      ['Registry', 'Book ' + (snapshot.bookNo ?? '—')
        + '  ·  Page ' + (snapshot.pageNo ?? '—')
        + '  ·  Entry ' + (snapshot.entryNo ?? '—')],
      ['Officiating minister', snapshot.officiantName],
    ].filter((e) => e[1])
    : [
      ['Date of birth', longDate(person.dateOfBirth)],
      ['Place of birth', person.placeOfBirth],
      snapshot.dateOfDeath && ['Date of death', longDate(snapshot.dateOfDeath)],
      ['Date of the record', longDate(snapshot.recordDate)],
      ['Registry', 'Book ' + (snapshot.bookNo ?? '—')
        + '  ·  Page ' + (snapshot.pageNo ?? '—')
        + '  ·  Entry ' + (snapshot.entryNo ?? '—')],
      ['Officiating minister', snapshot.officiantName],
    ].filter(Boolean).filter((e) => e[1])

  const SECTION_Y = isMarriage ? 318 : 306
  const FOOT = 468
  const FOOT_RULE = FOOT - 10

  rule(doc, LEFT, SECTION_Y, RIGHT, { weight: 0.4 })

  const perRow = band.length > 5 ? 4 : 3
  const bandW = BODY_W / perRow
  const rows = Math.ceil(band.length / perRow)
  const blockH = rows * 28 + (snapshot.purpose ? 34 : 0)
  const BAND_Y = SECTION_Y + Math.max(14, (FOOT_RULE - SECTION_Y - blockH) / 2)

  band.forEach((entry, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const inRow = Math.min(perRow, band.length - row * perRow)
    const indent = ((perRow - inRow) * bandW) / 2
    field(doc, entry[0], entry[1], LEFT + indent + col * bandW, BAND_Y + row * 28, bandW - 14)
  })
  if (snapshot.purpose) {
    wideField(doc, 'Issued for', snapshot.purpose, LEFT, BAND_Y + rows * 28 + 6, BODY_W)
  }

  rule(doc, LEFT, FOOT_RULE, RIGHT, { weight: 0.4 })

  doc.image(qr, LEFT, FOOT, { width: 66 })
  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
    .text('SCAN TO VERIFY', LEFT, FOOT + 70, { width: 66, align: 'center', characterSpacing: 0.6 })

  caption(doc, 'Verification code', LEFT + 86, FOOT + 14, 220, 'left')
  doc.font('Courier-Bold').fontSize(16).fillColor(INK)
    .text(certificate.verificationCode ?? '', LEFT + 86, FOOT + 28, { characterSpacing: 2.5, lineBreak: false })

  const SIG_X = 536
  const SIG_W = RIGHT - SIG_X
  if (signature) {
    doc.image(signature, SIG_X + (SIG_W - 180) / 2, FOOT + 2, { fit: [180, 36], align: 'center' })
  }
  rule(doc, SIG_X, FOOT + 42, RIGHT, { weight: 0.6, color: INK })
  const sigSize = fitSize(doc, snapshot.signatoryName ?? '', 'Times-Bold', SIG_W, 11, 8)
  doc.font('Times-Bold').fontSize(sigSize).fillColor(INK)
    .text(snapshot.signatoryName ?? '', SIG_X, FOOT + 48, { width: SIG_W, align: 'center', lineBreak: false })
  doc.font('Helvetica').fontSize(7).fillColor(MUTED)
    .text('PARISH PRIEST', SIG_X, FOOT + 64, { width: SIG_W, align: 'center', characterSpacing: 1.2 })

  doc.end()
  return finished
}
