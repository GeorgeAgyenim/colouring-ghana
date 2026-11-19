# Boundary layer stays blank after a quick off and on

Status: done
Type: task
Blocked by: none
Feature doc: docs/location-search.md; decision record docs/decisions/0001 (local)
Requirements: none recorded on this branch
Branch: `fix/location-search-02-boundary-layer-refetch` off `feature/location-search`
Source: review of the whole branch for problems, 19 November 2026

## Problem

The Regions and Districts layers download their boundary file the first time they are switched on. If the
person switches the layer off while the file is still downloading, the download finishes but its result is
thrown away, and the layer has already noted that it asked. Switching the layer on again does nothing: the
boundaries never appear until the page is reloaded.

The districts file is 6.6 MB, so on mobile data the download takes seconds and this is easy to hit.

Cause, in `app/src/frontend/map/layers/admin-boundary-layer.tsx`: the effect's cleanup runs when `enabled`
changes, not only when the component is removed, and sets the flag that discards the response; while
`requestedRef` stays true.

## What to build

Discard the response only when the component has really been removed. A response that arrives while the
layer is switched off is kept, so the next switch-on shows it at once with no second download. A failed
download still allows a retry, as now.

## Acceptance criteria

- [x] Test: enable, disable before the response, let the response arrive, enable again: the layer is drawn
      and the file was requested once.
- [x] Test: a failed request followed by enabling again requests the file again.
- [x] Test: no state update after the component is removed.
- [x] In the running app with the network throttled: Districts on, off, on shows the boundaries.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: `admin-boundary-layer.tsx` now discards a late response only when the layer component has been
  removed from the page. Switching the layer off no longer discards it.
- Tests: `app/src/frontend/map/layers/__tests__/admin-boundary-layer.test.tsx`, 4 tests. The off-then-on test
  failed against the old code (no boundaries drawn after switching back on) and passes now. The retry test
  and the removed-component test pass on the old code too, because that behaviour already existed; each was
  checked by breaking the line it guards and seeing it fail.
- Whole suite: 64 tests pass (60 before). `npm run typecheck` passes. No lint errors in the changed files.
- Running app, Chrome on Linux: the districts download was held back by 6 seconds in the page (a stand-in
  for a slow connection, not a throttled network). Districts on, off, wait for the file, on: all 261
  districts drawn, the file requested once, no console errors. Off and on again: still one request.
- Not checked: a real slow mobile connection; a phone.
- Found, not changed (outside this ticket): a download that fails while the layer is on is retried only
  after switching off and on; and `apiGet` does not check the HTTP status, so an error page that happens to
  be JSON would be kept as if it were boundary data.
- The removed-component test relies on React 17 warning about a state update after removal. React 18 no
  longer warns, so that test will need another way to prove the same thing after an upgrade.
