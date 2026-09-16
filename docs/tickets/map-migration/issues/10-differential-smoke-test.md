# Differential Playwright smoke test: same path, both stacks

Status: spec-complete
Type: task
Blocked by: 07b, 08, 09
Spec: docs/tickets/map-migration/PRD.md (seam 5)
Requirements: FR-9.5; ADRs: ADR-0027

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

One Playwright test runs the shared path on both stacks via the map-stack flag against the dev server and proves
they agree: at the fixed coordinates the building id from the local hit-test (MapLibre) equals the id from the
locate endpoint (Leaflet); legend and colour state after each category switch match; and on MapLibre an edit
appears in the overlay without reload. This is the automated backstop to the human parity checklist while the
stacks coexist; it is deleted with the flag (ticket 13).

## Acceptance criteria

- [ ] The test reads the same path file as the benchmark script and fails if the file is missing or changed shape.
- [ ] Building id equality, legend and colour equality per category switch, and the overlay assertion all pass on
      the dev server with the dev database.
- [ ] Runs on demand with one documented command; feature doc "How to test" updated; `CHANGELOG.md` updated.

## Blocked by

- `docs/tickets/map-migration/issues/07b-edits-since-overlay-client.md`.
- `docs/tickets/map-migration/issues/08-boundaries-search-and-geolocation.md`.
- `docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md`.
