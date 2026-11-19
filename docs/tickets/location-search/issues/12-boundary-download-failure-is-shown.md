# A boundary layer that fails to download says so

Status: done
Type: task
Blocked by: none
Feature doc: docs/location-search.md; decision record docs/decisions/0001 (local)
Requirements: none recorded on this branch
Branch: `fix/location-search-12-boundary-failure-message` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

If the Regions or Districts file fails to download (the districts file is 6.6 MB; mobile data drops), the
button still reads "Districts on" and the map shows nothing. No message explains it, and the only way to
try again is to switch the layer off and on, which nobody would guess.

Separately, the download helper does not look at the HTTP status. If a server or proxy answered with an
error written as JSON, the layer would keep that answer as if it were boundary data, draw nothing, and
never try again.

Code: `app/src/frontend/map/layers/admin-boundary-layer.tsx`.

## What to build

- While a layer is switched on and its last download failed, show a short message on the map:
  "Could not load the district boundaries. Check your connection." (or "region boundaries") with a
  "Try again" button. A screen reader announces it. It is readable in both the light and the dark map theme
  and does not cover the layer buttons on a phone-sized screen.
- "Try again" downloads the file again. The message goes when the download succeeds or the layer is
  switched off. Switching off and on still retries, as now.
- An answer that is not boundary data (not a GeoJSON feature collection) counts as a failed download.

## Acceptance criteria

- [x] Test: a failed download while the layer is on shows the message naming the layer.
- [x] Test: "Try again" requests the file again; when it arrives the boundaries are drawn and the message
      is gone.
- [x] Test: switching the layer off removes the message.
- [x] Test: an answer that is not a feature collection is treated as a failure and can be retried.
- [x] The tests from issue 02 still pass unchanged.
- [x] In the running app, with the districts request made to fail: the message appears in both themes and
      at phone width; "Try again" with the request working again draws the boundaries.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: `admin-boundary-layer.tsx` keeps a failed flag. While the layer is on and its last download failed,
  a message sits over the map: "Could not load the region boundaries. Check your connection." (or district)
  with a "Try again" button. An answer that is not a GeoJSON feature collection counts as a failure.
- While a retry is on its way the message stays and the button reads "Trying again…"; a second press starts
  nothing. The message goes when the file arrives; if the retry fails, the message and the button stay, so the
  keyboard focus is not lost. A download that fails while the layer is switched off shows nothing; switching
  on tries again.
- The message is a plain box in the map's corner, not a map layer, so it does not move with the map. Both
  layers' messages share one box and stack. Clicks on it do not reach the map. Below 990px wide it sits top
  left, below the search box and right of the side-panel tab; from 990px, bottom left, clear of the layer
  buttons. Below 990px the layer buttons are hidden, so on a phone a layer can only be on if it was switched
  on at a wider size.
- Tests: 10 new in `map/layers/__tests__/admin-boundary-layer.test.tsx`; issue 02's 4 unchanged. They failed
  before the change; the not-boundary-data, map-click and switched-off guards were each checked by removing
  them.
- Whole suite: 100 tests pass (90 before). `npm run typecheck` passes. No new lint errors.
- Running app (development server, Chrome on Linux, both boundary requests forced to fail in the page):
  one message per layer, stacked, readable in the light and dark themes; at 390px and 320px wide the box
  clears the side-panel tab, the search box and the zoom buttons; "Try again" with the request working again
  made one request, drew all 261 districts and removed that message; the click did not select a building.
- Feature doc: `docs/location-search.md`, Failure modes.
