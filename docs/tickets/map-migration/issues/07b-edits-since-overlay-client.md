# Edits-since overlay: an edit appears on the map without reload

Status: spec-complete
Type: task
Blocked by: 06, 07a
Spec: docs/tickets/map-migration/PRD.md (decisions 26 to 29)
Requirements: FR-9.3, FR-9.5, P5; ADRs: ADR-0021, ADR-0022, ADR-0023

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A contributor on the MapLibre stack selects a building, edits an attribute, saves, and sees the new colour on the
map within seconds, before any nightly build, and the change in the edit history as today.

After reading the manifest, the map fetches edits from `as_of` minus a 60-second grace margin through the
endpoint from ticket 07a, via the shared API helpers, and draws them as a GeoJSON source styled by the same
expressions as the archive, above it. Every overlay feature hides its base twin through a `superseded`
feature-state; demolished features hide the base and draw nothing. The manifest is re-read and the overlay
refreshed after the contributor's own save and every five minutes while the tab is visible. A failed overlay
fetch leaves the archive rendering and logs an error without coordinates; a truncated overlay shows a short notice
in the layer-options panel. Offline, there is no overlay and the archive keeps rendering.

## Acceptance criteria

- [ ] Full round trip on the MapLibre stack: edit, save, new colour visible without reload and before any nightly
      export; the edit appears in the edit history.
- [ ] Where an overlay feature exists, the base feature is hidden (no stale colour visible at partial opacity);
      a demolished building disappears from the map.
- [ ] After a nightly export the overlay shrinks to edits after the new `as_of`.
- [ ] With the endpoint blocked (devtools), the map still renders from the archive and no coordinates appear in
      the console; with the cap forced low, the truncated notice appears in the layer-options panel.
- [ ] Grace margin and refresh interval are named constants recorded in the feature doc.
- [ ] Feature doc privacy section: nothing new leaves the browser except a timestamp; `CHANGELOG.md` updated;
      module headers cite FR-9.3, ADR-0022.

## Blocked by

- `docs/tickets/map-migration/issues/06-local-selection-and-highlight.md` (selection and save on the new stack).
- `docs/tickets/map-migration/issues/07a-edits-since-endpoint.md`.
