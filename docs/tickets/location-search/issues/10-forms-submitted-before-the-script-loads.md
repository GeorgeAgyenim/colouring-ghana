# Forms submitted before the page's script has loaded

Status: done
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-10-forms-before-script` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

Pages are built on the server and the browser's script then takes them over. Until the script has loaded
(slow mobile data), a form behaves as plain HTML.

- **Passwords can end up in the address.** The log-in, sign-up, forgotten-password, password-reset and
  account forms (`app/src/frontend/user/`) have no `method`, so a plain submit is a GET: the browser puts
  every field, password included, into the address, where it stays in the history and reaches server and
  proxy logs.
- **The edit form posts to an address nothing handles.** `app/src/frontend/building/data-container.tsx`
  gives the form `action="/edit/<category>/<id>"` with `method="POST"`. The server has never had a handler
  that saves such a post; it shows the page again and the edit is lost. Issue 03 corrected the address's
  base path, but the address itself misleads: the form saves only through the script.
- Buttons inside the edit form with no `type` (`building/data-containers/community.tsx`,
  `disaster-management.tsx`, `building/data-components/verification.tsx`) count as submit buttons and send
  that post if pressed before the script loads.

## What to build

- Give every form in `app/src/frontend/user/` that has a password, email or username field `method="POST"`.
  A submit before the script loads then posts to the page's own address; the server shows the page again
  and the fields are never in the address. With the script loaded nothing changes.
- Edit form: remove `action`, keep `method="POST"`, and say in a comment that the form saves only through
  the script and that POST is there so an early submit never puts field values in the address. Replace the
  test that checked the address (`building/__tests__/data-container.test.tsx`).
- Give the untyped buttons inside the edit form `type="button"`.

Not in scope: making forms work without the script.

## Acceptance criteria

- [x] Test: the log-in, sign-up, forgotten-password and password-reset forms, as the server sends them,
      have `method="POST"`.
- [x] Test: the edit form, as the server sends it, has `method="POST"` and no `action`.
- [x] Test: the buttons named above have `type="button"`.
- [x] Shown by reading or by test: a POST to a page address (for example `/login.html`) gets the page
      back, and the server neither reads nor logs its body.
- [x] In the running app with the script loaded: logging in with wrong details still shows the usual
      message, and the edit form's buttons behave as before.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: the log-in, sign-up, forgotten-password and password-reset forms, and the three account forms
  (log out, new API key, delete account), have `method="POST"`. The account forms have no password, email or
  username field; they change something, so a GET was wrong for them too. The edit form has no `action` and
  keeps `method="POST"`, with a comment saying why.
- Buttons: 48, not the 7 named, sat inside the edit form with no `type` (every category's "Click to show …"
  map buttons, and Verify and Remove). All are `type="button"`. Every handler already stopped the default
  action, so nothing changes once the script has loaded.
- Tests: `user/__tests__/forms-before-script.test.tsx` (the page as the server sends it),
  `building/__tests__/data-container.test.tsx` (rewritten: it pinned the edit form's address, which this issue
  removes on purpose), `building/data-containers/__tests__/edit-form-buttons.test.tsx` (every category, view
  and edit: no button in the edit form can submit it except Save), and `src/__tests__/page-post.test.ts` (the
  real server: a POST to `/login.html` gets the same page back, and what was posted is neither in the page
  nor in the log). All but the last failed before the change; the last was checked by adding a body parser
  and a log line to the server and seeing it fail.
- Whole suite: 125 tests pass (90 before). `npm run typecheck` passes. No new lint errors.
- Running app (development server, Chrome on Linux): the served log-in and sign-up forms have
  `method="POST"`; a wrong log-in still shows "The username does not exist in the system" with nothing added
  to the address; on a building page the edit form has `method="POST"`, no `action`, 23 buttons of type
  button and one submit; a "Click to show …" button still switches the map.
- Limit: the server cannot currently build a building page (issue 14), so it never sends the edit form; the
  edit-form part takes effect before the script loads only once 14 is done.
- Found, not changed: `data-containers/energy-performance.tsx` puts a `<form>` inside the edit form, which
  is not valid HTML.
