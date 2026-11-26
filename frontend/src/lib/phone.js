// The parish contact number rule, mirroring requireContactNo in server/src/lib/validators.js.

const NOISE = /[\s()\-.]/g
const MOBILE = /^09\d{9}$/
const LANDLINE = /^0[2-8]\d{7,8}$/
const INTERNATIONAL = /^\+?63(\d{9,10})$/

export const CONTACT_HINT = 'A PH mobile or landline, e.g. 09171234567 or (054) 472-1234.'

export const CONTACT_ERROR = `That contact number is not valid. ${CONTACT_HINT}`

export function normaliseContactNo(value) {
  const stripped = String(value ?? '')
    .trim()
    .replace(NOISE, '')
  const international = INTERNATIONAL.exec(stripped)
  return international ? `0${international[1]}` : stripped
}

export function isContactNo(value) {
  const national = normaliseContactNo(value)
  return MOBILE.test(national) || LANDLINE.test(national)
}
