import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'


const BLUE = '#1f3a93'
const GOLD = '#c9a227'
const INK = '#1a1a1a'
const MUTED = '#5b5b5b'

function longDate(ymd) {
  if (!ymd) return '—'
  const [year, month, day] = String(ymd).split('-').map(Number)
  if (!year || !month || !day) return String(ymd)
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function line(doc, label, value) {
  if (!value) return
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label.toUpperCase(), { characterSpacing: 0.6 })
  doc.font('Times-Roman').fontSize(12).fillColor(INK).text(String(value))
  doc.moveDown(0.6)
}

export async function buildCertificatePdf({ certificate, verifyUrl }) {
  const snapshot = certificate.snapshot ?? {}
  const qr = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 240 })

  const doc = new PDFDocument({
    size: 'A4',
    margin: 56,
    info: {
      Title: `${certificate.documentName} — ${snapshot.subjectName ?? ''}`,
      Author: snapshot.parishName,
    },
  })

  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.font('Times-Bold').fontSize(16).fillColor(BLUE).text(snapshot.parishName ?? '', { align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
  doc.text(snapshot.parishAddress ?? '', { align: 'center' })
  if (snapshot.parishContact) doc.text(snapshot.parishContact, { align: 'center' })
  doc.moveDown(1.2)

  doc.moveTo(56, doc.y).lineTo(539, doc.y).lineWidth(2).strokeColor(GOLD).stroke()
  doc.moveDown(1.2)

  doc.font('Times-Bold').fontSize(22).fillColor(INK)
    .text(certificate.documentName.toUpperCase(), { align: 'center', characterSpacing: 1.5 })
  doc.moveDown(1.5)

  doc.font('Times-Roman').fontSize(12)
    .text('This is to certify that the following entry appears in the parish register:')
  doc.moveDown(1)

  for (const person of snapshot.subjects ?? []) {
    doc.font('Times-Bold').fontSize(15).fillColor(BLUE).text(person.fullName)
    doc.fillColor(INK)
    line(doc, 'Date of birth', person.dateOfBirth ? longDate(person.dateOfBirth) : null)
    line(doc, 'Place of birth', person.placeOfBirth)
    line(doc, 'Father', person.fatherName)
    line(doc, 'Mother', person.motherName)
    line(doc, 'Sponsors', person.sponsorNames)
    doc.moveDown(0.4)
  }

  line(doc, 'Date of the record', longDate(snapshot.recordDate))
  if (snapshot.dateOfDeath) line(doc, 'Date of death', longDate(snapshot.dateOfDeath))
  line(doc, 'Registry', `Book ${snapshot.bookNo} · Page ${snapshot.pageNo} · Entry ${snapshot.entryNo}`)
  line(doc, 'Officiating minister', snapshot.officiantName)
  line(doc, 'Issued for', snapshot.purpose)

  doc.moveDown(1.5)
  const qrTop = doc.y
  doc.image(qr, 56, qrTop, { width: 96 })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('Scan to verify', 56, qrTop + 100, { width: 96, align: 'center' })

  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('VERIFICATION CODE', 176, qrTop)
  doc.font('Courier-Bold').fontSize(16).fillColor(INK)
    .text(certificate.verificationCode, 176, qrTop + 14, { characterSpacing: 2 })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(verifyUrl, 176, qrTop + 38, { width: 320 })

  doc.font('Times-Roman').fontSize(12).fillColor(INK).text(snapshot.signatoryName ?? '', 176, qrTop + 70)
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Parish Priest', 176, qrTop + 86)

  doc.end()
  return finished
}