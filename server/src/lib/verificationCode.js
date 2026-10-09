import { randomInt } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'
const CODE_LENGTH = 12

export function mintVerificationCode() {
  let code = ''
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return code
}
