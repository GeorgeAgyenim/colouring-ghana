# Some API answers send the raw error to the caller

Status: spec-complete
Type: task
Blocked by: 07 (both change `app/src/api/api.ts` and `controllers/userController.ts`)
Feature doc: none
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

- [ ] Test, through the real API router with the database failing: each route listed answers with an
      `error` text, and the answer contains no query, username, email, password, user id or API key.
- [ ] Test: a wrong username or password at log-in still gets the message it gets today.
- [ ] `grep` over `app/src/api` finds no `res.send(error)`, `res.send(err)` or `{ error: err }` that sends a
      thrown value.
- [ ] Test: an error thrown by the page route reaches the server's own handler and is logged without its message.
- [ ] `npm test` and `npm run typecheck` pass.
