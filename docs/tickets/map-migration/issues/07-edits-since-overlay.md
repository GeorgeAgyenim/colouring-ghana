# Edits-since endpoint and overlay: an edit appears on the map without reload

Status: spec-complete
Type: task
Blocked by: 06
Spec: docs/tickets/map-migration/PRD.md (decisions 25 to 29; seam 3)
Requirements: FR-9.3, FR-9.5, NFR-2.6, NFR-3.4, P5; ADRs: ADR-0021, ADR-0022, ADR-0023

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A contributor on the MapLibre stack selects a building, edits an attribute, saves, and sees the new colour on the
map within seconds, before any nightly build, and the change in the edit history as today.

Server: `GET /api/buildings/edited-since?after=<ISO 8601>` returns a GeoJSON FeatureCollection of buildings whose
latest revision timestamp is at or after `after` (inclusive), with `building_id`, the styled attribute set,
`location_number` and a `demolished` flag; never a username, user id or revision metadata. Invalid `after` gives
400. A row cap is enforced and reported in the response; a short per-query statement timeout applies; the response
carries a short `Cache-Control` TTL.

Client: after reading the manifest, the map fetches edits from `as_of` minus a 60-second grace margin and draws
them as a GeoJSON source styled by the same expressions, above the archive; every overlay feature hides its base
twin through a `superseded` feature-state; demolished features hide the base and draw nothing. The manifest is
re-read and the overlay refreshed after the contributor's own save and every five minutes while the tab is
visible. A failed overlay fetch leaves the archive rendering and logs an error without coordinates; a truncated
overlay shows a short notice in the layer-options panel.

## Acceptance criteria

- [ ] jest (node environment, data access mocked): row cap enforced and reported; timestamp validation; inclusive
      `>=` boundary; `demolished` flag present; no username or contributor identity in any output field.
- [ ] Full round trip on the MapLibre stack: edit, save, new colour visible without reload and before any nightly
      export; the edit appears in the edit history.
- [ ] After a nightly export the overlay shrinks to edits after the new `as_of`.
- [ ] With the endpoint blocked (devtools), the map still renders from the archive and no coordinates appear in
      the console.
- [ ] Endpoint called through the shared API helpers; response headers show the short TTL; statement timeout, cap,
      grace margin and refresh interval recorded as named constants in the feature doc.
- [ ] Feature doc privacy section: nothing new leaves the browser except a timestamp; `CHANGELOG.md` updated;
      module headers cite FR-9.3, ADR-0022.

## Blocked by

- `docs/tickets/map-migration/issues/06-local-selection-and-highlight.md` (selection and save on the new stack).
