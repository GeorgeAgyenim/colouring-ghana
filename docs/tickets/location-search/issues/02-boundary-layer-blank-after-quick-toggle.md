# Boundary layer stays blank after a quick off and on

Status: spec-complete
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

- [ ] Test: enable, disable before the response, let the response arrive, enable again: the layer is drawn
      and the file was requested once.
- [ ] Test: a failed request followed by enabling again requests the file again.
- [ ] Test: no state update after the component is removed.
- [ ] In the running app with the network throttled: Districts on, off, on shows the boundaries.
- [ ] `npm test` and `npm run typecheck` pass.
