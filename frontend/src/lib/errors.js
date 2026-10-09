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
