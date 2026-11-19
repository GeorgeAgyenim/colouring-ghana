# Three small faults: a sign-up refusal, an account-page message, the static error pages

Status: done
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

- [x] Test: sign-up with a username that is a number, an object or missing gets a refusal message, not
      "Server error"; the same for the password.
- [x] Test: each account action whose request fails shows its own message, not "Error getting API key.".
- [x] `grep` finds no "London" and no root-anchored link in `app/public/*.html`.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Sign-up: a username or password that is not text gets "Username must be text" / "Password must be text"
  (a missing one keeps "… is required"), HTTP 200 like the other refusals, nothing logged, no database
  query. Log-in refuses a username or password that is not text, or is missing, with the existing "Username /
  password pair not recognised", before any query (before, a number reached the query). Password reset now
  also refuses a password that is not text. Issue 15's test that required "Server error" for this case is
  replaced, on purpose, by tests for numbers, objects and missing values.
- Account requests that get no answer: log-in, sign-up, loading the account, log-out, new API key and
  deleting the account each say what failed ("Could not delete the account. Check your connection and try
  again."), and the log-in and sign-up buttons no longer stay disabled after a failed request. The
  forgotten-password and password-reset pages, also account requests, got the same treatment ("Could not
  request a password reset…", "Could not change the password…"); the password-reset page used to fail
  silently.
- 404.html and 500.html: "Colouring Ghana", no London text, one link, `./`, to the home page. They are only
  served as plain files at `/404.html` and `/500.html` (under the sub-path behind the proxy); nothing in the
  app sends them in place of another page.
- Tests: API (sign-up and log-in, through the real router), `user/__tests__/account-requests-without-answer`
  and `password-pages-without-answer`, and `src/__tests__/static-error-pages.test.ts`. They failed before.
- Whole suite: 313 tests pass (285 before). `npm run typecheck` passes. No new lint errors.
- Running app: `/404.html` reads "Not found | Colouring Ghana" with the one link.
