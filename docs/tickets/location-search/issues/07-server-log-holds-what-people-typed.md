# The server log holds what people typed and who they are

Status: done
Type: task
Blocked by: none
Feature doc: none; onboarding-guide.md (Error flow, Logging); decision record docs/decisions/0005 (local)
Requirements: none recorded on this branch
Branch: `fix/location-search-07-server-log-privacy` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

The project rule is: never log a person's location, the data they send, or who they are. The API breaks
it in three ways.

On every normal request:

- `app/src/api/dataAccess/building.ts` line 79 logs every value of every saved edit (`'Setting', buildingId, sets`).
- `app/src/api/dataAccess/verify.ts` line 53 logs the value on every verification.
- `app/src/api/services/user.ts` line 84 logs the username on every failed login.
- `app/src/api/controllers/userController.ts` line 55 logs the user id when an account is deleted.

When something fails, whole error objects are logged (`console.error(error)`, and
`console.log('Global error handler: ', err)` in `app/src/api/api.ts`). A database error carries the failed
query with its values, so the log can receive: a new account's username, email and password in plain text
(`user.ts` line 44, for example when the username is taken); an API key (`user.ts` line 162); the place
clicked on the map (`query.ts` line 24, `buildingController.ts` line 22); search text (`search.ts` line 24);
edit values and user ids. A request body that is not valid JSON is logged whole.

Verifying a value that no longer matches the saved one is treated as a database failure
(`app/src/api/services/building/verify.ts` lines 31 to 46): the person is told "Database error" (HTTP 500)
and the value they sent is written to the log. The same happens for an attribute that cannot be verified
and for verifying twice.

## What to build

- Remove the two log lines that record values on every edit and every verification.
- Failed login and account deletion are still logged as events, without the username or user id.
- One small function that logs an error safely: its name, its message, and for a database error the
  database's error code, constraint and table. Never the query, its values, the database's `detail` text,
  or a request body. Use it in the API's global error handler and in every place listed above that logs a
  whole error. Our own `DatabaseError` wraps another error in `detail`; log that inner error the same safe way.
- Verification refusals (value does not match, attribute cannot be verified, already verified) are answered
  as an ordinary refusal (HTTP 400) with a message that says what is wrong and does not repeat the value.
  They are not logged as errors. Check what the form shows for each (`data-container.tsx` `handleVerify`).
- A request body that is not valid JSON is answered with HTTP 400 and is not logged.
- Building ids may stay in the log: they identify a building, not a person.

## Acceptance criteria

- [x] Test: saving an edit and verifying a value write neither the value nor the user id to the log.
- [x] Test: a failed login does not log the username; deleting an account does not log the user id.
- [x] Test: the safe log function, given a database error carrying a query, values and `detail`, logs
      none of them, and does log the error code and constraint.
- [x] Test: through the real API router, a database failure while creating an account logs no username,
      email or password; a failed API-key lookup logs no key.
- [x] Test: verifying a value that does not match gets HTTP 400 with a message that does not contain the
      value, and nothing about it is logged; the same for an attribute that cannot be verified.
- [x] Test: a body that is not valid JSON gets HTTP 400 and none of its text is logged.
- [x] `grep` over `app/src/api` finds no `console.log` or `console.error` that is passed a whole error
      object, a request body, a field value, a username, an email or a user id.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: the log lines that recorded every saved value and every verified value are gone; a failed log-in
  and an account deletion are logged as events without the username or user id. Every place in
  `app/src/api`, `app/src/tiles` and `app/src/frontendRoute.tsx` that logged a whole error now uses
  `logErrorSafely` (`app/src/api/logError.ts`). Its rule, which goes slightly beyond the ticket's wording:
  an error's message is logged only for the project's own error classes, because the database's own messages
  can repeat a value (`invalid input syntax for type uuid: "<the key sent>"`); and the stack's "at …" lines
  are logged so an unexpected error can still be found. Recorded in decision record 0005 (local) and in
  `onboarding-guide.md`.
- Verification refusals are now HTTP 400 with plain messages, not 500 "Database error", and are not logged:
  "The value sent does not match the saved value, so it was not verified. Reload the building and try
  again.", "Field cannot be verified", and "User already verified that attribute for this building". The
  form shows them in its error box. A refused verification of current land use or original use no longer
  saves `…_verified` or clears the message.
- A body that is not valid JSON gets HTTP 400 "Request body is not valid JSON" and is not logged.
- Also: the name of a field that does not exist is no longer logged (it is whatever the request sent);
  `parseJsonOrDefault` no longer logs its parse error (it reads the paste data from the page address);
  creating an account answers "Database error" instead of `{}` when the database gives no detail; the global
  handler writes to the error stream.
- Tests: `api/__tests__/logError.test.ts` (17), `api/__tests__/log-privacy.test.ts` (20, the real API router
  with the database faked: each checks that the value or identity really reached the faked database and is
  not in the log), `src/__tests__/helpers.test.ts` (2), `validateUpdate.test.ts` (+1),
  `building/__tests__/edit-form-refused-verification.test.tsx` (2). They failed before the change.
- Whole suite: 131 tests pass (90 before). `npm run typecheck` passes. No new lint errors.
- Remaining `console` calls in `app/src/api`: fixed texts, a field name that is known to the app, a
  password-reset token's error code, and the helper itself.
- Not checked against a real database: the shapes of database errors were taken from the installed pg,
  pg-protocol and pg-promise code. Proxy access logs, which hold query strings, are outside the repository.
- Left for issue 15: answers that send the raw error to the caller, and errors that reach Express's own
  handler (which prints the stack and message) from outside the API.
