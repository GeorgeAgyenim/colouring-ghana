# FR-9: Map migration (Leaflet + Mapnik to MapLibre GL + PMTiles)

- Requirements: FR-9.1, FR-9.2, FR-9.3, FR-9.5; NFR-1.4, NFR-1.5, NFR-2.5, NFR-2.6, NFR-3.4, NFR-3.5, NFR-4.1
- ADRs: ADR-0009, ADR-0018, ADR-0022, ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0027
- Status: In progress
- Owner: product owner (George)
- Last updated: 2026-09-16

Spec: `docs/tickets/map-migration/PRD.md`. Tickets: `docs/tickets/map-migration/issues/`. This document grows
one section per ticket; the parity checklist, defect log and gate sign-offs (ADR-0027) are added by tickets 11
and 12.

## What it does (plain English)

The map will be drawn in the browser from a single nightly tile archive instead of pictures rendered on the
server per tile. Before anything is switched, the current map is measured so the claim "faster and lighter" can
be checked against numbers rather than impressions. This document currently covers that measurement harness
(ticket 09).

## How it works (technical)

### Benchmark harness and shared path file (ticket 09)

- **Path file** `app/e2e/map-path.json` (format version 1): the initial viewport (`cc-config.json`), two named
  places, the zoom steps 12 to 19, the category pair (age, then construction material) and one fixed building.
  `app/e2e/map-path.ts` validates its shape and fails loudly on any drift; the differential smoke test
  (ticket 10) reads the same file.
- **Benchmark script** `app/e2e/benchmark/map-benchmark.e2e.ts` (Playwright, Chromium) follows method v1
  (`docs/benchmarks/map-migration-method.md`): one run (A, B or C) per invocation, five repetitions, a fresh
  browser context per repetition, and the cold-cache assertion. It drives the Leaflet map with user gestures
  only (mouse drags, the zoom control, the sidebar category links, a click), so the Leaflet tree is untouched
  (PRD decision 1). Pans are exact pixel drags computed in `web-mercator.ts`; the script checks the map pane
  moved by exactly that offset.
- **Measurements**: time-to-interactive is navigation start to the first time the map settles (every Leaflet
  tile loaded, no zoom animation, no request in flight, resource count stable for 500 ms); per-resource timing
  and `transferSize` come from the Performance API resource entries (`page-measure.ts`); a Chrome DevTools
  Protocol capture (`network-capture.ts`) supplies the cache flags for the cold-cache rule, the in-flight
  count, and the bytes of cross-origin responses whose Performance entry hides them (the OSM basemap sends no
  `Timing-Allow-Origin`). `metrics.ts` classifies resources (buildings tiles, basemap, API, other) and
  aggregates each segment; `results.ts` and `report.ts` turn the run records into the dated result file.
- **Output**: `docs/benchmarks/<date>-map-<before|after>/run-<A|B|C>.json` (raw record, result format 1) and
  `docs/benchmarks/<date>-map-<before|after>.md` re-rendered from every run record present. The markdown is
  generated; do not edit it by hand.
- **Self-check fixture** `app/e2e/benchmark/stub-map/`: a stand-in map page (Leaflet, a fake tile server with
  Mapnik-like headers, a fake locate endpoint, a second origin as the basemap) so the harness itself can be
  exercised on any machine without a database. It proves the mechanics, never a benchmark.
- The clarifications the script forced on method v1 (zoom-out transition, the Leaflet settle rule, the precise
  cold-cache rule, cross-origin bytes) are recorded in `docs/benchmarks/map-migration-method.md`.

## Tools and libraries

- `@playwright/test` 1.63.0 (Apache-2.0), Chromium 153.0.8010.12 (Playwright build 1243) · drives the browser
  and records measurements · chosen because it scripts a pan-and-zoom path, exposes the Performance API and
  the DevTools Protocol, throttles the network per page and connects to Android Chrome over remote debugging ·
  alternatives: Lighthouse (no tile latency on a pan path, no phone), manual timing (not reproducible). See
  `docs/tools/inventory.md`.

## Design choices made during implementation

No new ADR: these are choices inside a test harness, not architecture; the choice of Playwright over Lighthouse
or manual timing is recorded in the inventory row, and ADR-0027 fixes what the benchmark is for.

- **Gestures, not a test hook.** The script could have exposed the Leaflet map object on `window` for exact
  `setView` calls. Rejected: it would change the Leaflet tree during the epic (PRD decision 1) and measure a
  programmatic path a visitor never takes. Drags are exact because Leaflet 1.9 applies no inertia when the
  pointer rests more than 50 ms before release, and the script verifies the pane offset after every drag.
- **A recorded zoom-out transition.** Method v1 pans to two places and then zooms 12 to 19, but the site opens
  at zoom 16. The path pans to place 1 at zoom 16, zooms out to 12 there (recorded as its own segment, "Zoom
  out 16 to 12 (transition)"), pans to place 2 at zoom 12 and then steps up. Nothing is hidden and the segment
  is identical for the "after" run.
- **Cold-cache rule, precisely.** A fresh context starts empty, so a cached response is a violation only when
  its URL was never fetched over the network earlier in the same repetition. Reuse within a repetition (the
  same tile requested twice) is counted per segment as "reused from cache", contributes 0 bytes, and is
  excluded from latency percentiles. Inline `data:` and `blob:` URLs (Leaflet's placeholder tile) are not
  network responses and are ignored.
- **The Location category opens first.** Opening `/view/location` shows the `location` tileset, so both
  category switches in the path (age, then construction material) really change the tile layer. Opening
  `/view/age-history` would make the first switch a no-op.
- **Byte source order.** Performance API `transferSize` when it is above zero; otherwise the DevTools
  `encodedDataLength` for the same URL; otherwise the response counts as 0 bytes and is reported as unmeasured.
- **Run B profile as constants.** `throttle-profiles.ts` records the Chrome "Slow 4G" values (562.5 ms
  latency, 180,000 B/s down, 84,375 B/s up) rather than naming a browser preset that may be renamed.

## Privacy and "as of" handling

The benchmark runs against a development server and fetches only public map tiles and public building records.
The path file holds coordinates of public places (an OpenStreetMap-mapped suburb and a university library), not
any person's location. The script sends nothing to any host other than the site under test and the basemap host
the site already uses. Nothing new leaves the browser.

## Limitations and known issues

- Named laptop for runs A and B: Unknown — to be confirmed by the product owner. Named Android phone for
  run C: Unknown — to be confirmed by the product owner. Both are passed to the script as `BENCHMARK_DEVICE`
  and printed in the result file.
- The Mapnik "before" runs A, B and C are **not yet recorded**: the machine the harness was built on has no
  credentials for a Colouring Ghana database, so the script was verified against the checked-in stand-in page
  (`npm run benchmark:map:selfcheck`) and not against the real map. The product owner records the runs (see "How to reproduce
  results"); until then `docs/benchmarks/<date>-map-before.md` does not exist and the NFR-1.4 and bytes targets
  are unknown.
- The fixed building (Prempeh II Library, KNUST; OpenStreetMap way 378630226) and the two places were chosen
  from OpenStreetMap. Whether the development and production databases carry footprints there is
  Unknown — to be confirmed by the product owner; the script fails with a clear message if the click selects
  nothing, and the path file can then name another building (a new path file sha256 is recorded in every result).
- Run C assumes the phone's Chrome accepts a new browser context over remote debugging. Verified against a
  desktop Chromium started with `--remote-debugging-port`; on the named Android phone it is
  Unknown — to be confirmed by the product owner.
- On a narrow viewport (run C) the sidebar starts collapsed; the script opens it for each category switch and
  collapses it again. The laptop viewport is fixed at 1280x800.
- Headless Chromium identifies itself as `HeadlessChrome` to the OSM tile host, which may serve it differently
  from a visitor's browser. Basemap bytes are reported for completeness only; the comparison is on buildings
  tiles (method v1, Controls).

## How to test

Unit tests for the pure parts (path file validation, Web Mercator maths, statistics, cold-cache rule, result
rendering) run inside the normal suite:

```bash
cd app
CI=true npm test                     # includes app/e2e/**/*.test.ts (jest)
npm run typecheck:e2e                # tsc over app/e2e
npx eslint --ext .ts e2e
```

To check the harness itself on any machine (no database), start the stand-in page and point a one-repetition
run at it; the output lands outside `docs/`:

```bash
cd app
npm run benchmark:map:selfcheck      # stand-in map page on http://localhost:3999 (Ctrl-C to stop)
BENCHMARK_RUN=A BENCHMARK_REPETITIONS=1 BENCHMARK_BASE_URL=http://localhost:3999 \
  BENCHMARK_OUTPUT_DIR=/tmp/benchmark-selfcheck BENCHMARK_DEVICE=selfcheck npm run benchmark:map
```

The browser suite runs on demand, never in `npm test`. It needs the dev server with the dev database:

```bash
cd app
npx playwright install chromium      # once per machine (downloads the pinned Chromium build)
npm start                            # in another terminal: dev server on http://localhost:3000
BENCHMARK_RUN=A BENCHMARK_DEVICE="<laptop make and model>" npm run benchmark:map
```

The path file is `app/e2e/map-path.json`. It is the only place the journey is defined: change it only with a
new method version, because every result file records its sha256 and results with different hashes are not
comparable. The differential smoke test (ticket 10) must read it through `loadMapPath()` in
`app/e2e/map-path.ts`, which throws `MapPathError` if the file is missing or has changed shape.

Environment variables the script reads: `BENCHMARK_RUN` (A, B or C; required), `BENCHMARK_BASE_URL` (default
`http://localhost:3000`), `BENCHMARK_DEVICE`, `BENCHMARK_CONNECTION`, `BENCHMARK_DATE` (default today, UTC),
`BENCHMARK_LABEL` (`before`, the default, or `after`), `BENCHMARK_REPETITIONS` (default 5), `BENCHMARK_HEADED=1`
(show the browser), `BENCHMARK_OUTPUT_DIR` (default `docs/benchmarks`), `BENCHMARK_CDP_ENDPOINT` (run C),
`BENCHMARK_PROXY` (what sits in front of the server; default `none`), `BENCHMARK_BASELINE_DATE` (after runs;
default the newest `-map-before` folder).

## How to reproduce results

To record the "before" baseline (ticket 09, before ticket 12 flips the default), on the named laptop with the
dev server and dev database running:

```bash
cd app
BENCHMARK_RUN=A BENCHMARK_DEVICE="<laptop>" BENCHMARK_CONNECTION="<office connection>" npm run benchmark:map
BENCHMARK_RUN=B BENCHMARK_DEVICE="<laptop>" npm run benchmark:map
```

For run C, plug in the named Android phone with USB debugging on, open Chrome on it, and:

```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote
# the phone must reach the dev server: use the laptop's LAN address, or `adb reverse tcp:3000 tcp:3000`
BENCHMARK_RUN=C BENCHMARK_CDP_ENDPOINT=http://127.0.0.1:9222 BENCHMARK_BASE_URL=http://<laptop-lan-address>:3000 \
  BENCHMARK_DEVICE="<phone make and model>" BENCHMARK_CONNECTION="mobile data, <network>" npm run benchmark:map
```

Each command writes `docs/benchmarks/<date>-map-before/run-<X>.json` and re-renders
`docs/benchmarks/<date>-map-before.md`; commit both. The "after" runs (ticket 12) use the same commands with
`BENCHMARK_LABEL=after` once the MapLibre driver is added to the script.

## Change history

| Date | Change | Ticket | ADR |
|---|---|---|---|
| 2026-09-16 | Playwright harness, shared path file, benchmark script and result renderer added; runs not yet recorded | `docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md` | ADR-0027 |
