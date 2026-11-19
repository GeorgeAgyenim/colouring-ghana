# GhanaPost GPS address is checked on the server

Status: done
Type: task
Blocked by: none
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Branch: `fix/location-search-04-gps-address-validation` off `feature/location-search`
Source: review of the whole branch for problems, 19 November 2026

## Problem

The GhanaPost GPS address field (`location_gps_address`, migration 061) is checked for its format only in
the browser (`gpsAddressPattern` in `app/src/frontend/building/data-containers/location.tsx`). The API
accepts any text. Text of 15 or more characters breaks the database's length rule and comes back as a
server error instead of a message the person can act on. Text that is short but wrong is saved and then
indexed for search.

## What to build

Add `location_gps_address` to `app/src/api/config/fieldSchemaConfig.ts` so that
`validateFieldChange` in `app/src/api/services/domainLogic/validateUpdate.ts` rejects a value that does
not match the format. Clearing the field (null) must still be allowed. Keep one definition of the format
if a shared module fits; if not, each copy names the other in a comment.

## Acceptance criteria

- [x] Test: `GA-183-9385` is accepted; `ga-183-9385`, `GA1839385`, `hello` and a 20-character string are
      rejected with the API's normal invalid-field error, not a server error.
- [x] Test: null is accepted.
- [x] The browser shows the rejection as a message on the form.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: `location_gps_address` has a format rule in `fieldSchemaConfig.ts`, so the API refuses a value
  that does not match before anything is saved. The format has one definition, `gpsAddressPattern` in
  `app/src/helpers.ts`, a module the browser code and the API already shared; `location.tsx` now imports it.
- Decisions: null is accepted (it clears the field, and it is what the form sends when the box is emptied).
  An empty string and anything that is not text (a number, a list) are refused.
- Also changed, because this ticket would otherwise have started it: the API used to write a refused value
  to the server log. A mistyped GPS address is still a location, so the log line now names the field only.
  This applies to every field with a format rule.
- Tests: 17 in `api/services/__tests__/domainLogic/validateUpdate.test.ts` (11 failed before the change;
  the log test was checked by putting the value back and seeing it fail), 2 in `api/__tests__/api.test.ts`
  through the real API router over HTTP (a 20-character value gets 400 "Invalid format of data sent", not a
  server error), and 1 in `frontend/building/__tests__/edit-form-refused-edit.test.tsx` (the form shows the
  API's message).
- Whole suite: 80 tests pass (60 before). `npm run typecheck` passes. No new lint errors.
- "The browser shows the rejection as a message on the form": shown by test only, with the API's answer
  faked on the browser side. It was not tried with a real save in the running app, because the development
  database account cannot write. In normal use the browser's own format check stops a wrong value before it
  is sent, so the API's message is seen only when that check is bypassed.
- Every way a building edit reaches the database was traced: only `POST /api/buildings/<id>.json`, which
  runs the check before the transaction opens. Verifying a value does not write new text.
- Addresses saved before this check: left as they are. The development database has none; production was
  not looked at. An old value in another format can still be verified, and must be corrected or cleared
  the next time that field is edited.
- Found, not changed (outside this ticket):
  - The message does not say which field was refused. Naming it was tried and taken out again: it changes
    the API's error text for every field, and it would show the internal name `location_gps_address`.
  - `api/services/building/verify.ts` puts the value a person sent into an error that the API then logs.
  - Pasting edits onto several buildings from the map shows nothing when the API refuses one.
