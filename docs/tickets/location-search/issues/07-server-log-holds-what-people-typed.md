# The server log holds what people typed and who they are

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none
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

- [ ] Test: saving an edit and verifying a value write neither the value nor the user id to the log.
- [ ] Test: a failed login does not log the username; deleting an account does not log the user id.
- [ ] Test: the safe log function, given a database error carrying a query, values and `detail`, logs
      none of them, and does log the error code and constraint.
- [ ] Test: through the real API router, a database failure while creating an account logs no username,
      email or password; a failed API-key lookup logs no key.
- [ ] Test: verifying a value that does not match gets HTTP 400 with a message that does not contain the
      value, and nothing about it is logged; the same for an attribute that cannot be verified.
- [ ] Test: a body that is not valid JSON gets HTTP 400 and none of its text is logged.
- [ ] `grep` over `app/src/api` finds no `console.log` or `console.error` that is passed a whole error
      object, a request body, a field value, a username, an email or a user id.
- [ ] `npm test` and `npm run typecheck` pass.
