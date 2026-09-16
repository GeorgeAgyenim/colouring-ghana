# Benchmark method — map migration (NFR-1.4, NFR-1.5)

Defined 2026-09-16 during the map-migration `/grill-with-docs` session. Every dated result file in this folder
that cites this method must state the method version below, the hardware, browser version, connection and
date. Results: `docs/benchmarks/<YYYY-MM-DD>-map-<before|after>.md`.

Method version: 1

## Why bytes as well as time

Bandwidth, not latency, is the binding constraint for Colouring Ghana's visitors. Every timing is therefore
recorded with the bytes transferred for the same step, and the pass rule applies to both.

## Path (identical for every run)

A checked-in Playwright script (`app/benchmarks/map-path.ts`, to be written with the first baseline run)
drives Chromium through:

1. Load the site at the initial viewport (`cc-config.json` position and zoom) with a fresh browser context.
2. Pan to two named places (fixed coordinates in the script).
3. Zoom from 12 to 19 one level at a time, pausing until tiles settle.
4. Switch category colouring twice (age, then construction material).
5. Select one fixed building.

## Runs

| Run | Device | Connection | Purpose |
|---|---|---|---|
| A | Named laptop | Office connection, unthrottled | Best case |
| B | Named laptop | Playwright network throttling, fixed slow-4G/3G profile (values recorded in the script) | Fully reproducible comparison; the run the pass rule is judged on |
| C | Named Android phone, Chrome via remote debugging | Mobile data | Field check |

Five repetitions per run; report median and p95.

## Measurements

- Time-to-interactive: Navigation Timing plus first map `idle` event.
- Tile latency: per-tile response time from the Performance API (resource entries for `/tiles/` before,
  the PMTiles archive range requests after); p95 across the path.
- Bytes transferred per path segment (initial load, each pan, each zoom step, each category switch, the
  selection), from the same resource entries.

## Controls

- Cold cache: a fresh browser context per repetition; the script asserts no cached responses.
- State whether any CDN or proxy is in front of the server (none in E0).
- The OSM raster basemap is identical before and after, so the comparison isolates the buildings layer.
- Same script commit, same path coordinates, same category pair.

## Pass rule

"After" must be less than or equal to "before" on every metric in run B. The NFR-1.4 time-to-interactive
target and a bytes target are set from the recorded baseline, not guessed; they are written into the
"before" file and repeated in the "after" file with the result.
