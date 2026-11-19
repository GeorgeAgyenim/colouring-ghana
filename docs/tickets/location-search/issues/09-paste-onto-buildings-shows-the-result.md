# Pasting values onto buildings shows what happened

Status: done
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-09-paste-result` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

A person can copy values from one building and paste them onto others by clicking each on the map
(`/multi-edit/<category>`). After a click nothing tells them the result. On success the map redraws and
that is all. When the API refuses the edit, the person is logged out, or the connection fails, nothing
happens on screen: the refusal goes only to the browser's console (`app/src/frontend/map-app.tsx`,
`colourBuilding`). Someone working along a street cannot tell which buildings were changed.

The panel shown while pasting (`app/src/frontend/building/multi-edit.tsx`) already has a place for
messages but is never told the result.

## What to build

`MapApp` keeps the result of the latest click and passes it to the panel, which shows one of:

- changed: "Building updated."
- the building already had those values (the API says "No change provided"): "That building already has
  these values."
- refused or failed: "The building you clicked was not changed: <reason>", where the reason is the API's
  message, or "could not reach the server. Check your connection and click the building again." when the
  request itself failed.

The message is cleared when the next click starts. If two clicks finish out of order, the message is for
the latest click. A screen reader announces it.

## Acceptance criteria

- [x] Test: a successful paste shows "Building updated."
- [x] Test: a refused paste shows "The building you clicked was not changed:" with the API's reason.
- [x] Test: "No change provided" shows "That building already has these values."
- [x] Test: a failed request shows the connection message.
- [x] Test: when an earlier click finishes after a later one, the later click's message stays.
- [ ] In the running app: the panel shows a message after a click (the development database account
      cannot write, so a refusal or failure is what can be shown there; say which was seen).
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status. One criterion is not met; see
below.

- Change: `map-app.tsx` keeps the result of the latest click and `building/multi-edit.tsx` shows it, with the
  four texts the ticket gives. Messages that are information use `role="status"`; refusals and failures use
  the existing error box (`role="alert"`).
- Also changed, because "the message is cleared when the next click starts" and "the message is for the
  latest click" cannot hold otherwise: the map (`map/map.tsx`) looks the building up before it hands the
  click to the app. It now tells the app when a click starts (`onBuildingLookupStarted`) and when the lookup
  fails (`onBuildingLookupFailed`, including the server's `{ error }` answer), and it ignores the answer to
  an earlier click once a later click has been made. That last part applies in every map mode: before, two
  quick clicks could select the building of the first one.
- Also: the message is cleared when the person leaves the paste page.
- Tests: `building/__tests__/multi-edit-paste-result.test.tsx` (13) through the real app with the map
  replaced; `map/__tests__/map-click.test.tsx` (5) through the real map with the lookup faked. The message
  tests failed before the change; the out-of-order lookup test was checked by removing its guard.
- Whole suite: 108 tests pass (90 before). `npm run typecheck` passes. No new lint errors.
- **Not met: "In the running app".** The paste page needs a logged-in person, and the development database
  account cannot write sessions, so the panel could not be reached in the running app. Shown by tests only.
- Known limits: any answer that is not JSON (for example a proxy's error page) is reported as "could not
  reach the server"; the API also says "No change provided" when none of the pasted fields was usable, which
  the panel reports as "already has these values".
