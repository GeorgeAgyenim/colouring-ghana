# Gate 1: opt-in in production and the parity checklist run

Status: spec-complete
Type: task
Blocked by: 10
Spec: docs/tickets/map-migration/PRD.md (decision 4; Parity checklist v1)
Requirements: FR-9.1, FR-9.5; ADRs: ADR-0018, ADR-0027

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

The migration branch is merged and deployed to production with `MAP_STACK=leaflet`, the nightly export job
scheduled in the quiet window, and MapLibre opt-in through `?map=maplibre`. The product owner and at least two
planners or contributors, one on an Android phone over mobile data, work through parity checklist v1 on their own
devices. Every row, tester role, device, connection type and date is recorded in the feature doc; each finding is
logged as blocking or cosmetic in the defect log. Blocking defects are fixed (as fix tickets off the integration
branch) and the affected rows re-run. Gate 1 passes when every row is ticked and no blocking defect is open, and
the product owner signs off with the date and checklist version.

## Acceptance criteria

- [ ] Production runs the migration branch with the Leaflet default; the export job has produced at least one
      manifest in production and its log is readable.
- [ ] Checklist copied into the feature doc with per-run columns; every row ticked by at least one Android tester on
      mobile data; full edit round-trip and geolocation rows ticked by every tester.
- [ ] Defect log present; no open blocking defect; cosmetic defects accepted or fixed without resetting anything.
- [ ] Testers' roles and devices recorded (no names beyond role are needed in the doc).
- [ ] Product owner sign-off line: date, checklist version, decision.
- [ ] `CHANGELOG.md` entry for the production release behind the flag.

## Blocked by

- `docs/tickets/map-migration/issues/10-differential-smoke-test.md` (which transitively requires 01 to 09).
