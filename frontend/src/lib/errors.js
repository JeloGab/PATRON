// Error codes are the contract — they live in `docs/error_codes.md` and the server
// adds a row in the same commit that introduces one. This is the single place they
// become sentences, so the same code cannot be worded two different ways on two pages.
//
// Anything unlisted falls through to a generic line rather than showing the raw code,
// but the code is still logged, because a code reaching a user unmapped is a gap in
// this file, not in the server.
const MESSAGES = {
  // Client-side, never from the server
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong. Please try again.',

  // Shape and validation
  MISSING_FIELDS: 'Some required fields are missing.',
  INVALID_NAME: 'That name is not valid — 2 to 50 characters.',
  INVALID_PARISH_NAME: 'Parish name must be between 3 and 50 characters.',
  INVALID_ADDRESS: 'Address must be at least 5 characters.',
  INVALID_CONTACT: 'Contact number must be a PH mobile number, e.g. 09171234567.',
  INVALID_EMAIL: 'That email address is not valid.',
  INVALID_USERNAME: 'That username is not valid.',
  INVALID_PARISH_ID: 'That parish reference is not valid.',
  INVALID_USER_ID: 'That account reference is not valid.',
  INVALID_STATUS: 'That status is not valid.',

  // Conflicts and missing rows
  PARISH_NOT_FOUND: 'That parish no longer exists. Refresh the registry.',
  PARISH_INACTIVE: 'That parish is deactivated — reactivate it before provisioning staff.',
  USERNAME_TAKEN: 'That username is already taken. Try a different name.',
  USER_NOT_FOUND: 'That account no longer exists. Refresh the list.',

  // Permission and rate limiting
  FORBIDDEN: 'You are not allowed to do that.',
  UPDATE_BLOCKED: 'That change was refused. Refresh and try again.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait about 15 minutes before trying again.',

  // Accounts and passwords.
  //
  // INVALID_CREDENTIALS is 401 but is NOT a dead session — on change-password it means
  // the current password was mistyped. `isSessionError()` lists the only three codes
  // that end a session, which is why it is safe to word this as a field error.
  INVALID_CREDENTIALS: 'That password is not correct.',
  MISSING_CREDENTIALS: 'Fill in both fields.',
  PASSWORD_TOO_SHORT: 'That password is too short — at least 8 characters.',
  PASSWORD_TOO_LONG: 'That password is too long — 72 bytes at most.',
  PASSWORD_CHANGE_REQUIRED:
    'Your account is still on its temporary password. Change it before continuing.',
  NOT_A_STAFF_ACCOUNT:
    'This account signs in through email, so its password is changed by a reset link, not here.',
  INVALID_RESET_TOKEN:
    'That reset link has expired or has already been used. Ask for a new one.',
  EMAIL_NOT_VERIFIED:
    'Confirm your email address first — open the link that was sent to you, then sign in again.',
  ACCOUNT_INACTIVE: 'This account has been deactivated. Ask your parish office to restore it.',

  // Sacramental records
  INVALID_RECORD_TYPE: 'Choose one of the four registers: baptism, confirmation, marriage or death.',
  INVALID_REGISTRY_NUMBER: 'Book, page and entry numbers are all required.',
  INVALID_RECORD_DATE: 'That date of the sacrament is not valid.',
  INVALID_DEATH_DATE: 'A date of death belongs only on a death record, and must be a valid date.',
  INVALID_BIRTH_DATE: 'A date of birth is required for baptism and confirmation, and must be valid.',
  INVALID_OFFICIANT: "The officiant's name is required.",
  INVALID_GENDER: 'Gender must be male or female, and a marriage needs one of each.',
  INVALID_SUBJECTS:
    'A marriage needs exactly two subjects, one male and one female. Every other register takes exactly one.',
  INVALID_RECORD_ID: 'That record reference is not valid.',
  INVALID_SUBJECT_ID: 'That subject reference is not valid.',
  RECORD_NOT_FOUND: 'That record no longer exists. Search again.',
  SUBJECT_NOT_FOUND: 'That subject no longer exists. Reopen the record.',
  REGISTRY_ENTRY_TAKEN:
    'That book, page and entry is already used in this register. Check the ledger and use the next entry.',
  NO_FIELDS_TO_UPDATE: 'Nothing was changed.',

  // Server-side failures
  PROVISIONING_FAILED: 'The account could not be created. Please try again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again shortly.',
  INTERNAL_ERROR: 'The server hit an unexpected error. Please try again.',
}

export function messageFor(result) {
  const code = result?.json?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  // A failed outbound call the user is not told about must still be logged.
  console.error('[api] unmapped error', result?.status, code, result?.json)
  return MESSAGES.REQUEST_FAILED
}

export default MESSAGES
