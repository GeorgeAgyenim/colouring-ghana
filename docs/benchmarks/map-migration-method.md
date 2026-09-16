# Benchmark method — map migration (NFR-1.4, NFR-1.5)

Defined 2026-09-16 during the map-migration `/grill-with-docs` session. Every dated result file in this folder
that cites this method must state the method version below, the hardware, browser version, connection and
date. Results: `docs/benchmarks/<YYYY-MM-DD>-map-<before|after>.md`.

Method version: 1

## Why bytes as well as time

Bandwidth, not latency, is the binding constraint for Colouring Ghana's visitors. Every timing is therefore
recorded with the bytes transferred for the same step, and the pass rule applies to both.

## Path (identical for every run)

A checked-in Playwright script (to be written with the first baseline run) reads the shared path
definition also used by the Playwright smoke test (grilling record, test seam 5) and drives Chromium through:

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

## Clarifications recorded with the first script (2026-09-16; version stays 1)

The script named above now exists (`app/e2e/benchmark/map-benchmark.e2e.ts`, ticket
`docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md`). Writing it fixed four points
the text left open. None changes the path coordinates, zoom steps, category pair, building, runs, repetitions
or pass rule, and no result cites this method yet, so the version number is unchanged.

1. **Getting to zoom 12.** The site opens at zoom 16 (`cc-config.json`), so step 2 pans to the first place at
   zoom 16, zooms out to 12 there, and pans to the second place at zoom 12 before step 3 begins. The zoom-out
   is recorded as its own segment, "Zoom out 16 to 12 (transition)", with bytes, and is part of the path for
   both "before" and "after".
2. **"Map idle" on Leaflet.** Leaflet has no idle event. The map counts as settled when every tile element has
   loaded, no zoom animation is running, no request is in flight and the resource count has not changed for
   500 ms; time-to-interactive is navigation start to the first settle. The "after" script must use the same
   settle rule, taking MapLibre's `idle` event as its "tiles loaded" signal, so the two stacks are compared on
   one definition. Navigation Timing values are kept in the raw JSON record.
3. **Cold-cache rule, precisely.** A fresh browser context starts empty, so a cached response is a violation
   when its URL was never fetched over the network earlier in the same repetition. A response reused from
   the cache within a repetition (the same tile requested twice on the path) is counted per segment, adds no
   bytes and is left out of latency percentiles. Inline `data:` and `blob:` URLs are not network responses.
4. **Bytes for cross-origin responses.** The OSM basemap host sends no `Timing-Allow-Origin`, so its resource
   entries report zero bytes; the script takes those byte counts from the DevTools Protocol instead and marks
   the source in the record. CDN or proxy presence is an input to each run (`BENCHMARK_PROXY`, default
   "none") and is printed in the result file.
