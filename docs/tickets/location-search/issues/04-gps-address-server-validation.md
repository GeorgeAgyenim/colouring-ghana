# GhanaPost GPS address is checked on the server

Status: spec-complete
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

- [ ] Test: `GA-183-9385` is accepted; `ga-183-9385`, `GA1839385`, `hello` and a 20-character string are
      rejected with the API's normal invalid-field error, not a server error.
- [ ] Test: null is accepted.
- [ ] The browser shows the rejection as a message on the form.
- [ ] `npm test` and `npm run typecheck` pass.
