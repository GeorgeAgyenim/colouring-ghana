# Location marker: a plain dot, no direction arrow

Status: done
Type: task
Blocked by: none
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Decision record: docs/decisions/0004 (local)
Branch: none. Made directly on `feature/location-search`, as the plan the product owner approved on
19 November 2026 set out; an exception to the one-branch-per-ticket rule for a one-file change.
Source: product owner's decision, 19 November 2026, following a review of the whole branch for problems

## Decision

Decided by the product owner on 19 November 2026: the "you are here" marker is a plain dot,
as Google Earth Pro shows it, not an arrow that points where the phone is facing.

Why:

- The arrow needs the phone's compass. On Android in Chrome the old code read an angle that is not tied to
  north, so the arrow could point anywhere. A wrong arrow misleads a person standing at a building; a dot
  cannot be wrong.
- On iPhone the compass needs its own permission prompt on top of the location prompt.
- The arrow was redrawn on every sensor reading, many times a second, which costs battery on a phone.

Set aside:

- An arrow using only north-referenced readings, with a dot as the fallback. Correct, but it adds a second
  permission, a timer and device testing for a small gain.
- An arrow only while moving, from the GPS heading. Unreliable at walking pace and absent when standing still.

A separate rework of location services had planned to bring a corrected arrow back. It lived only on local
branches (`fix/location-services` and its ticket branches, never pushed) and was withdrawn and deleted the
same day, so nothing in this repository refers to it.

## What to build

In `app/src/frontend/map/geolocation-control.tsx`:

- Draw the position as a blue dot (`#1a6de0`, white outline) with the accuracy circle unchanged.
- Remove the compass: the device-orientation listener, the iPhone motion-permission request and the GPS
  heading fallback.
- Move the existing marker on each update instead of rebuilding its icon.
- The dot is not a keyboard stop. The old arrow could be reached with Tab and announced as a button,
  although it did nothing.
- Drop the extra indirection the "Go to my location" button needed only for the iPhone compass request.

Update the two comments in `app/src/frontend/map/search-results-layer.tsx` and the sentence in
`docs/location-search.md` that mention the arrow.

## Acceptance criteria

- [x] Test: a position shows one dot containing a circle, with no rotation.
- [x] Test: a second position moves the same dot.
- [x] Test: nothing listens for device orientation.
- [x] Test: "Go to my location" centres the map on the position.
- [x] Test: removing the control from a live map removes the dot and stops the watch.
- [x] In the running app: dot with accuracy circle, the button re-centres, no arrow.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Tests: `app/src/frontend/map/__tests__/geolocation-control.test.tsx`, 5 tests. They failed against the
  arrow code (it threw where the browser has no device-orientation support) and pass now. The clean-up test
  was checked by deleting the line that removes the dot: it fails without it.
- Whole suite: 60 tests pass (55 before). `npm run typecheck` passes. No lint errors in the changed files.
- Running app, Chrome on Linux with location allowed: one blue dot with its accuracy circle; "Go to my
  location" puts the dot at the centre of the map at the closest zoom; no rotation; not a keyboard stop; no
  console errors.
- Not checked: how the dot looks on an iPhone or an Android phone.
- `geolocation-control.tsx` went from 443 to 322 lines.
