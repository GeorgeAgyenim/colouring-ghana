# A refused edit says which field to fix

Status: spec-complete
Type: task
Blocked by: 07 (both change `app/src/api/api.ts`)
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Branch: `fix/location-search-08-refusal-names-field` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

When the API refuses an edit because of one field, the edit form shows only "Invalid format of data sent",
"Field does not exist" or "Field is not editable". A category form has many fields and nothing is saved, so
the person cannot tell what to fix. The API knows the field (the error carries its name) but does not send it.

Issue 04 tried putting the field's internal name into the message and took it out: it changed the API's
text for every field and showed `location_gps_address` to the person.

## What to build

- API: when a refusal is about one field, the HTTP 400 answer gains a second property, `field`, holding the
  field's internal name. The `error` text does not change. Nothing else in the answer changes.
- Browser: `app/src/frontend/api-data/building-update.ts` turns `field` into the title the person sees on
  the form (`allFieldsConfig[field].title` in `app/src/frontend/config/data-fields-config.ts`) and the
  message becomes: `Nothing was saved. Check "<title>": <the API's message>`. If the field has no title,
  the API's message is shown as it is today. The internal name is never shown.
- `onboarding-guide.md` (the "Error flow" list): describe the 400 answer as it now is.

Adding a property is safe for existing API clients: nothing is removed or renamed.

## Acceptance criteria

- [ ] Test, through the real API router: a wrong GhanaPost GPS address gets HTTP 400 with
      `error` "Invalid format of data sent" and `field` "location_gps_address".
- [ ] Test: a refusal that is not about one field has no `field` property.
- [ ] Test: the edit form shows `Nothing was saved. Check "GhanaPost GPS address": Invalid format of data sent`.
- [ ] Test: an answer naming a field the browser has no title for shows the API's message alone.
- [ ] `npm test` and `npm run typecheck` pass.
