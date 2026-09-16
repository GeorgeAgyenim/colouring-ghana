# Gate 2: flip the production default to MapLibre, record the "after" benchmark, soak four weeks

Status: spec-complete
Type: task
Blocked by: 11
Spec: docs/tickets/map-migration/PRD.md (decisions 4, 19, 28; Further Notes)
Requirements: FR-9.1, NFR-1.4, NFR-1.5; ADRs: ADR-0027; PRD OD-11

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

Production flips to `MAP_STACK=maplibre` with `?map=leaflet` as the opt-out. At the flip the "after" benchmark is
recorded with the same script, path file, devices and method as the "before" file, and judged by the pass rule
(after ≤ before on every metric in run B). The soak runs four weeks; a blocking parity defect resets the clock,
cosmetic ones do not. During the soak the self-hosted basemap candidate for OD-11 is previewed with planners and
their view recorded. Gate 2 passes after four clean weeks with the product owner's dated sign-off.

## Acceptance criteria

- [ ] `docs/benchmarks/<date>-map-after.md` recorded for runs A, B and C citing method v1, repeating the targets
      from the "before" file with the result; pass rule met in run B, or the shortfall recorded and a decision
      taken by the product owner.
- [ ] Production default is MapLibre; opt-out verified from a fresh browser.
- [ ] Defect log maintained through the soak; soak start date, any resets and the end date recorded.
- [ ] OD-11 preview note in the feature doc (what was shown, to whom by role, what they said).
- [ ] Product owner sign-off line for gate 2 with date and checklist version.
- [ ] `CHANGELOG.md` entry for the default flip.

## Blocked by

- `docs/tickets/map-migration/issues/11-parity-run-and-gate-1.md`.
