// Error codes become sentences here, once. docs/error_codes.md is the contract.

const MESSAGES = {
  NETWORK_ERROR:
    'Cannot reach the server. Check that the API is running on port 4000 and that this page is on http://localhost:5173.',
  REQUEST_FAILED: 'Something went wrong. Please try again.',
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
  PARISH_NOT_FOUND: 'That parish no longer exists. Refresh the registry.',
  PARISH_INACTIVE: 'That parish is deactivated — reactivate it before provisioning staff.',
  PARISH_DEACTIVATED:
    'This parish has been deactivated. Contact the system administrator to restore access.',
  PARISH_HAS_OPEN_REQUESTS:
    'This parish still has certificate requests waiting. Settle or reject them before deactivating it.',
  USERNAME_TAKEN: 'That username is already taken. Try a different name.',
  USER_NOT_FOUND: 'That account no longer exists. Refresh the list.',
  FORBIDDEN: 'You are not allowed to do that.',
  UPDATE_BLOCKED: 'That change was refused. Refresh and try again.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait about 15 minutes before trying again.',
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
  INVALID_DOCUMENT_TYPE: 'Choose which certificate is being requested.',
  DOCUMENT_TYPE_UNAVAILABLE: 'That certificate is not being issued at the moment.',
  INVALID_RELATIONSHIP: 'Choose your relationship to the person named on the document.',
  INVALID_PURPOSE: 'Say what the certificate is for — 3 to 200 characters.',
  INVALID_SACRAMENT_YEAR: 'That year is not valid — 1800 or later, and not in the future.',
  APPLICATION_NOT_FOUND: 'That request no longer exists. Refresh the queue.',
  APPLICATION_NOT_PENDING:
    'This request is already being processed, so it can no longer be withdrawn.',
  APPLICATION_NOT_EDITABLE:
    'This request has moved on — it is no longer open for changes. Refresh to see its current state.',
  APPLICATION_NOT_VERIFIED:
    'A register entry must be attached before this can be approved. Refresh to see its current state.',
  RECORD_TYPE_MISMATCH:
    'That entry is from a different register than this certificate. Attach an entry from the matching register.',
  CERTIFICATE_NOT_FOUND: 'No certificate has been issued for this request yet.',
  VERIFICATION_CODE_TAKEN: 'The certificate could not be issued. Please try again.',
  INVALID_EVENT_TYPE: 'Choose whether this is a sacramental, general or seminar event.',
  INVALID_SACRAMENT_TYPE: 'Choose the sacrament: baptism, confirmation, marriage or funeral.',
  INVALID_TITLE: 'Give the event a title.',
  INVALID_EVENT_DATE: 'An event can only be scheduled for today or later.',
  INVALID_TIME_RANGE: 'Check the times — the end must be later than the start, and both are needed.',
  INVALID_PRIEST: 'Choose an active priest of this parish. A sacramental event must have one.',
  INVALID_EVENT_ID: 'That event reference is not valid.',
  EVENT_NOT_FOUND: 'That event no longer exists. Refresh the calendar.',
  EVENT_NOT_EDITABLE: 'This event is rejected, cancelled or completed, so it can no longer change.',
  EVENT_NOT_PENDING: 'This event has already been decided. Refresh to see its current state.',
  EVENT_NOT_COMPLETABLE: 'Only an approved event on or after its own date can be completed.',
  INVALID_DATE_RANGE: 'That date range is not valid — at most 92 days, and the end cannot precede the start.',
  INVALID_BLOCK_DATE: 'Only today or a later date can be blocked.',
  INVALID_BLOCK_ID: 'That blocked-date reference is not valid.',
  BLOCK_NOT_FOUND: 'That blocked date no longer exists. Refresh the list.',
  INVALID_PARTICIPANT_ID: 'That participant reference is not valid.',
  INVALID_REQUIREMENT_ID: 'That requirement reference is not valid.',
  PARTICIPANT_NOT_FOUND: 'That participant is no longer on the roster. Refresh the list.',
  PARTICIPANT_NOT_ACTIVE: 'That participant has already been withdrawn.',
  REQUIREMENT_NOT_FOUND: 'That requirement no longer exists. Reopen the checklist.',
  ROSTER_CLOSED:
    'This event is approved, so no new participant can be added. Corrections and withdrawals are still open.',
  SPONSOR_NOT_ALLOWED: 'A sponsor can only be recorded on a sacramental event.',
  RECORD_NOT_APPLICABLE:
    'This requirement is checked by hand — there is no register to attach an entry from.',

  INVALID_ANNOUNCEMENT_ID: 'That announcement reference is not valid.',
  INVALID_IMAGE_ID: 'That image reference is not valid.',
  ANNOUNCEMENT_NOT_FOUND: 'That announcement no longer exists. Refresh the list.',
  ANNOUNCEMENT_LOCKED:
    'This announcement is published or archived, so it can no longer be edited. Archive it and write a new one.',
  IMAGE_LIMIT_REACHED: 'An announcement can carry at most four images.',
  IMAGE_NOT_FOUND: 'That image no longer exists.',
  MISSING_FILE: 'No file was received. Try choosing it again.',
  INVALID_FILE_TYPE: 'That file is not an accepted image — JPEG or PNG only.',
  FILE_TOO_LARGE: 'That file is too large.',
  INVALID_CONTENT: 'Write the message of the announcement.',

  PROVISIONING_FAILED: 'The account could not be created. Please try again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is not responding. Please try again shortly.',
  INTERNAL_ERROR: 'The server hit an unexpected error. Please try again.',
}

export function messageFor(result) {
  const code = result?.json?.code
  if (code && MESSAGES[code]) return MESSAGES[code]

  console.error('[api] unmapped error', result?.status, code, result?.json)
  return MESSAGES.REQUEST_FAILED
}

export default MESSAGES
