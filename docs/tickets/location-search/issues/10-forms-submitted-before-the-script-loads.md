# Forms submitted before the page's script has loaded

Status: spec-complete
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

- [ ] Test: the log-in, sign-up, forgotten-password and password-reset forms, as the server sends them,
      have `method="POST"`.
- [ ] Test: the edit form, as the server sends it, has `method="POST"` and no `action`.
- [ ] Test: the buttons named above have `type="button"`.
- [ ] Shown by reading or by test: a POST to a page address (for example `/login.html`) gets the page
      back, and the server neither reads nor logs its body.
- [ ] In the running app with the script loaded: logging in with wrong details still shows the usual
      message, and the edit form's buttons behave as before.
- [ ] `npm test` and `npm run typecheck` pass.
