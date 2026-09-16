# Playwright harness, shared path file and the Mapnik "before" benchmark

Status: spec-complete
Type: task
Blocked by: none
Spec: docs/tickets/map-migration/PRD.md (Testing Decisions; decision 4, 28)
Requirements: NFR-1.4, NFR-1.5; ADRs: ADR-0027; method: docs/benchmarks/map-migration-method.md v1

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

The product owner can run one command and get a dated "before" benchmark of the current Leaflet and Mapnik map,
following method v1: a checked-in Playwright script reads one path file (initial viewport, two named places, zoom
steps 12 to 19, category pair age then construction material, one fixed building) and drives Chromium through it
with a fresh context per repetition, recording time-to-interactive, per-tile latency and bytes per segment. Runs A
(laptop, unthrottled), B (laptop, fixed throttle profile) and C (Android phone via remote debugging) with five
repetitions each, median and p95. The result file states hardware, browser, connection and date, and sets the
NFR-1.4 and bytes targets from the baseline.

The path file is the same one the differential smoke test (ticket 10) reads.

## Acceptance criteria

- [x] Playwright added as a pinned dev dependency with an inventory row; the suite runs on demand, not in
      `npm test`.
- [x] The script asserts a cold cache per repetition and fails if any response was served from cache.
- [ ] `docs/benchmarks/<date>-map-before.md` recorded for runs A, B and C citing method v1, with bytes beside
      every timing and the targets written in.
- [x] Named laptop and Android phone recorded, or "Unknown — to be confirmed by the product owner".
- [x] Path file documented in the feature doc "How to test"; `CHANGELOG.md` updated.

## Blocked by

- None (can start immediately). Must complete before ticket 12 flips the default.

## Comments

**2026-09-16 (implementation, `/implement`).** Harness, path file, benchmark script and result renderer are in
`app/e2e/`; unit tests for the pure parts run in `npm test`; the browser suite runs with `npm run benchmark:map`.
The script was verified end to end (runs A, B and C, including throttling and a remote-debugging connection)
against the checked-in stand-in page (`npm run benchmark:map:selfcheck`), because the implementation machine has
no credentials for a Colouring Ghana database. Code review (standards and spec axes) ran the same day; its
findings led to the method clarifications appended to `docs/benchmarks/map-migration-method.md`. **Outstanding for the product owner:** run A, B and C against the dev server on the named laptop and
phone (`docs/features/map-migration.md`, "How to reproduce results"), which writes
`docs/benchmarks/<date>-map-before.md` with the targets; confirm the database has a footprint at the fixed
building in `app/e2e/map-path.json` (the script fails clearly if not). The third acceptance criterion stays
unticked until those runs are committed.
