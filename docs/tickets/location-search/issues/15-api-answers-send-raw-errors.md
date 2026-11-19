# Some API answers send the raw error to the caller

Status: done
Type: task
Blocked by: 07 (both change `app/src/api/api.ts` and `controllers/userController.ts`)
Feature doc: none; onboarding-guide.md (Error flow)
Requirements: none recorded on this branch
Branch: `fix/location-search-15-api-raw-errors` off `feature/location-search`
Source: found while building issue 07, 19 November 2026

## Problem

Several API routes answer a failure by sending whatever was thrown (`res.send(error)`), not a message:
log-in, new API key and the map query in `app/src/api/api.ts` (about lines 38, 62 and 99), and creating,
reading and deleting the account in `app/src/api/controllers/userController.ts` (about lines 34, 47 and
63). A database error sent this way can carry the failed query with its values: for log-in that includes
the username and password that were typed; for others, user ids and emails. Express turns an error object
into `{}` in some cases and into its fields in others, so the browser either shows nothing useful or shows
internals.

Separately, an error that escapes the API's handler (headers already sent), the session store, the page
route or the tile server reaches Express's built-in handler, which prints the error's stack, message
included, outside issue 07's safe logging.

## What to build

Each of those routes answers a failure with `{ error: '<plain message>' }` (for a database failure:
"Database error", as the rest of the API does) and logs the failure with `logErrorSafely` from issue 07.
Refusals the person can act on keep their existing messages.

`app/src/server.tsx` ends with an error handler that logs with `logErrorSafely` and answers 500 (or closes
the connection when the answer has already started), so nothing reaches Express's own handler.

## Acceptance criteria

- [x] Test, through the real API router with the database failing: each route listed answers with an
      `error` text, and the answer contains no query, username, email, password, user id or API key.
- [x] Test: a wrong username or password at log-in still gets the message it gets today.
- [x] `grep` over `app/src/api` finds no `res.send(error)`, `res.send(err)` or `{ error: err }` that sends a
      thrown value.
- [x] Test: an error thrown by the page route reaches the server's own handler and is logged without its message.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- What the tests showed before the change: with the database failing, log-in answered 200 with the whole
  query, including the typed username and password, and the browser treated it as a successful log-in;
  deleting the account answered `{ success: true }` and signed the person out although nothing was deleted;
  reading the account answered an empty body; and when the session could not be ended the answer held the
  session id.
- Change: each route listed answers a failure with `{ error: "Database error" }` (a known database failure)
  or `{ error: "Server error" }` (anything else), HTTP 500, and logs it with `logErrorSafely`. A failed
  account deletion keeps the person signed in. The refusals a person can act on keep their messages ("The
  username does not exist in the system", "Username / password pair not recognised", "Password must be at
  least 8 characters long", "Must be logged in"); a sign-up refusal is now returned as such, not thrown.
- `app/src/server.tsx` ends with an error handler: it logs safely and answers 500 as plain text (a 4xx from
  Express, such as an address it cannot decode, keeps its status); if the answer had already started it
  closes the connection. The API's handler does the same instead of handing on to Express, whose own
  handler printed the error's message, and outside production put it into the page.
- Beyond the list: `app/src/tiles/tileserver.ts` sent a failed tile's query to the browser; it now answers
  `{ error: "Failed to render tile" }`.
- Tests: `api/__tests__/error-answers.test.ts` (15), `src/__tests__/server-error-handler.test.ts` (6),
  `tiles/__tests__/tile-error-answer.test.ts` (1). The failure cases failed before the change. Each checks
  the raw answer for user ids, usernames, emails, passwords, session ids and query text.
- Whole suite: 225 tests pass (203 before). `npm run typecheck` passes. No new lint errors.
- The browser reads these answers whatever their status, so no frontend change was needed: the forms show
  the plain message.
- Not tried against a real database. Found, not changed: a username that is not text gets "Server error"
  rather than a refusal; the account page says "Error getting API key." when a delete request gets no
  answer at all.
