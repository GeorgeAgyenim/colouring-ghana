# A boundary layer that fails to download says so

Status: spec-complete
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

- [ ] Test: a failed download while the layer is on shows the message naming the layer.
- [ ] Test: "Try again" requests the file again; when it arrives the boundaries are drawn and the message
      is gone.
- [ ] Test: switching the layer off removes the message.
- [ ] Test: an answer that is not a feature collection is treated as a failure and can be retried.
- [ ] The tests from issue 02 still pass unchanged.
- [ ] In the running app, with the districts request made to fail: the message appears in both themes and
      at phone width; "Try again" with the request working again draws the boundaries.
- [ ] `npm test` and `npm run typecheck` pass.
