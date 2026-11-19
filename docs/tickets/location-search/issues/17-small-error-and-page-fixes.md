# Three small faults: a sign-up refusal, an account-page message, the static error pages

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-17-small-fixes` off `feature/location-search`
Source: found while building issue 15, 19 November 2026; the product owner asked for them to be fixed the same day

## Problem

1. **Sign-up with a username that is not text** (possible only from an API client, not the form) makes
   `validateUsername` (`app/src/api/validation.ts`) throw a `TypeError`, which the API now answers as
   "Server error". It is a refusal the caller can act on.
2. **The account page says "Error getting API key."** when a request to delete the account, or another
   account request, gets no answer at all (`app/src/frontend/auth-context.tsx`, about lines 159 and 172): the
   message was copied from the API-key function.
3. **The static error pages** `app/public/404.html` and `500.html` call the site "Colouring London" and link
   to `/about` and `/about#sign-up` at the site root: outside the `/colouringghana` sub-path, and to a page this
   app does not have.

## What to build

1. A username or password that is missing or not text is refused like any other invalid one: HTTP 200
   `{ error: "<plain message>" }` as the other sign-up refusals are, not "Server error".
2. Each account request that gets no answer says what failed (for example "Could not delete the account.
   Check your connection and try again."), in plain words.
3. 404.html and 500.html: "Colouring Ghana" wording (from the city config where the page is built, or written
   out where it is static), no London project text, and links that stay inside the site wherever it is served
   (a link relative to the page, to the home page; check how and where these files are served: `express.static`
   serves them at `/404.html`, which is `/colouringghana/404.html` behind the proxy).

## Acceptance criteria

- [ ] Test: sign-up with a username that is a number, an object or missing gets a refusal message, not
      "Server error"; the same for the password.
- [ ] Test: each account action whose request fails shows its own message, not "Error getting API key.".
- [ ] `grep` finds no "London" and no root-anchored link in `app/public/*.html`.
- [ ] `npm test` and `npm run typecheck` pass.
