import { AppError } from '../../lib/appError.js'
import { suggestUsername, isValidUsername, isUuid, createTempCredential, resolveUsername } from '../../lib/credentials.js'
import { insertParish, listParishes, findParishById, insertStaff, listStaffByRole, setUserStatus, setStaffPassword } from './admin.queries.js'


const clean = (value) => String(value ?? '').trim()

export async function createParish({ name, address, contactNo, email, facebookPageId }) {
  const parishName = clean(name)
  const parishAddress = clean(address)
  const parishContact = clean(contactNo)
  const parishEmail = clean(email).toLowerCase()
  const parishFacebook = clean(facebookPageId)

  if (parishName.length < 3) throw new AppError('INVALID_PARISH_NAME', 400)
  if (parishAddress.length < 5) throw new AppError('INVALID_ADDRESS', 400)
  if (parishContact.length < 7) throw new AppError('INVALID_CONTACT', 400)
  if (parishEmail && !parishEmail.includes('@')) throw new AppError('INVALID_EMAIL', 400)

  return insertParish({
    name: parishName,
    address: parishAddress,
    contactNo: parishContact,
    email: parishEmail || null,
    facebookPageId: parishFacebook || null,
  })
}

export async function getParishes() {
  return listParishes()
}


export async function provisionPriest({ fullName, parishId, username }) {
  const name = clean(fullName)
  const parish = clean(parishId)

  if (name.length < 2) throw new AppError('INVALID_NAME', 400)
  if (!isUuid(parish)) throw new AppError('INVALID_PARISH_ID', 400)

  const target = await findParishById(parish)
  if (!target) throw new AppError('PARISH_NOT_FOUND', 404)
  if (target.status !== 'active') throw new AppError('PARISH_INACTIVE', 409)

  const requested = clean(username).toLowerCase()
  if (requested && !isValidUsername(requested)) throw new AppError('INVALID_USERNAME', 400)

  const base = requested || suggestUsername(name)
  if (!isValidUsername(base)) throw new AppError('INVALID_USERNAME', 400)

  const { tempPassword, passwordHash } = await createTempCredential()

  const user = await resolveUsername({ base, explicit: Boolean(requested) }, (candidate) =>
    insertStaff({ fullName: name, username: candidate, passwordHash, role: 'priest', parishId: parish })
  )

  return { user, tempPassword }
}

export async function getPriests(parishId) {
  const filter = clean(parishId)
  if (filter && !isUuid(filter)) throw new AppError('INVALID_PARISH_ID', 400)

  return listStaffByRole('priest', filter || null)
}

export async function setPriestStatus({ userId, status }, actor) {
  const target = clean(userId)
  if (!isUuid(target)) throw new AppError('INVALID_USER_ID', 400)
  if (status !== 'active' && status !== 'inactive') throw new AppError('INVALID_STATUS', 400)

  const user = await setUserStatus({ userId: target, role: 'priest', status, actorId: actor.userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)

  return user
}

export async function resetPriestPassword(userId) {
  const target = clean(userId)
  if (!isUuid(target)) throw new AppError('INVALID_USER_ID', 400)

  const { tempPassword, passwordHash } = await createTempCredential()

  const user = await setStaffPassword({ userId: target, role: 'priest', passwordHash })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)

  return { user, tempPassword }
}