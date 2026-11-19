# The privacy policy's email link does not open an email

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-13-privacy-email-link` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

`app/src/frontend/pages/privacy-policy.tsx` links the data protection contact as
`href="dataprotection@turing.ac.uk"`. Without `mailto:` the browser treats it as a page of the site and
the link leads nowhere.

## What to build

Make it `href="mailto:dataprotection@turing.ac.uk"`.

Not in scope, and for the product owner: the policy's wording is still the London project's (it names The
Alan Turing Institute and UCL as the organisations responsible). Who is responsible for Colouring Ghana's
data, and the contact address, is a legal question, not a code change.

## Acceptance criteria

- [ ] Test: the link's address starts with `mailto:`.
- [ ] `npm test` and `npm run typecheck` pass.
