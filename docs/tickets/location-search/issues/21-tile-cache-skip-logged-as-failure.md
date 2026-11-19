# A tile the cache does not keep is logged as a failure

Status: done
Type: bug
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-21-tile-cache-skip` off `feature/location-search`
Source: seen in the running app, 19 November 2026, zooming the map in to its deepest level

## Problem

Zoomed in to the deepest level (zoom 19), the server log fills with "Failed to cache tile: Error". The tiles
are drawn and served correctly; only the log is wrong.

Cause: building tiles are cached up to zoom 18 only (`shouldCacheFn` in
`app/src/tiles/rendererDefinition.ts`), and `TileCache.put` (`app/src/tiles/tileCache.ts`) signalled "not
keeping this tile" by throwing. `getTileWithCaching` logs whatever `put` throws as a failure. Since issue 07
the log no longer shows the message ("Skip cache put …"), so the line reads as a real failure.

## What to build

`TileCache.put` returns without storing for a tile outside the cache's domain, instead of throwing. A tile the
cache should keep but cannot write is still logged as a failure.

## Acceptance criteria

- [x] Test: a zoom-19 tile is served, not written to the cache, and nothing is logged.
- [x] Test: a zoom-18 tile is written to the cache.
- [x] Test: a tile the cache should keep but cannot write is logged as "Failed to cache tile:".
- [x] `npm test` and typecheck pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.
