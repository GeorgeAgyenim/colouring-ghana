# Tool and dependency inventory

Every runtime, build tool, library and external service the project depends on, with version, purpose,
licence, why it was chosen and what else was considered. Add a row before adding a dependency
(`CLAUDE.md`). "Inherited" means the item came with the `colouring-core` fork and was not chosen here.

## Runtime and build (established 16 September 2026, `docs/audit-2026-09.md`)

| Item | Version | Purpose | Notes |
|---|---|---|---|
| Node.js | 22.18 | Server and build runtime | `.travis.yml` and `provision/vm_provision.sh` still pin Node 12; both stale. No `.nvmrc`. |
| npm | bundled with Node 22 | Package manager | `app/package-lock.json` is the lockfile; no yarn or pnpm. |
| razzle | 4 | Build and dev server (webpack) | Inherited. Client sees only `RAZZLE_*` env vars at build time. |
| jest | 26.6 (bundled with razzle 4) | Test runner | `npm test` in `app/`; see ADR-0020. |
| eslint | as in `app/package.json` | Lint | `npm run lint` in `app/`. |
| pm2 | as installed on the VM | Process manager in production | `ecosystem.config.template.js`. |
| PostgreSQL / PostGIS | 12 / 3 (provision script) | Database | Inherited. Production version Unknown — to be confirmed by the maintainer. |
| GDAL | 3.4.1 on the dev machine; production Unknown — to be confirmed by the maintainer | ETL and export job (ADR-0025) | Inherited (`gdal-bin`). 3.4.1 has FlatGeobuf and MVT drivers, no Parquet. M1 needs ≥ 3.9. Licence MIT/X. |

## Map stack

| Item | Version | Purpose | Licence | Why chosen | Alternatives | Status |
|---|---|---|---|---|---|---|
| leaflet, react-leaflet | 1.7.x, 3.1.x | Current map (raster tiles) | BSD-2 / Hippocratic | Inherited | — | Retire after FR-9.5 parity and soak (ADR-0009, ADR-0018) |
| mapnik (node binding) | 4.5.x | Current server-side raster tile rendering | LGPL-2.1 | Inherited | — | Retire with Leaflet |
| maplibre-gl | to be pinned at implementation | Vector map rendering | BSD-3 | ADR-0009 | Leaflet + GeoJSON overlay; Mapnik + cache | Planned (E0) |
| pmtiles (JS) | to be pinned | Read PMTiles archives over Range requests | BSD-3 | Single-file archive, no tile server (ADR-0009) | Live tiles via Martin/pg_tileserv (ADR-0022) | Planned (E0) |
| @vis.gl/react-maplibre | to be pinned; verify React 17 / TS 4.2 peers | React binding for MapLibre (Map, Source, Layer, useMap) | MIT | ADR-0026 | react-map-gl; hand-rolled hooks (the in-E0 fallback if peers fail) | Planned (E0) |
| tippecanoe (Felt fork) | to be pinned; built from source on the VM | Build the PMTiles archive nightly | BSD-2 | ADR-0025 | GDAL MVT + pmtiles convert; Planetiler; Node geojson-vt | Planned (E0) |

## External services

| Service | Used for | Terms | Compliance notes |
|---|---|---|---|
| tile.openstreetmap.org (OSM Foundation raster tiles) | Basemap under the buildings, today and in E0 | [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/): donated service; a valid HTTP User-Agent or Referer identifying the application is required; bulk downloading and offline caching are prohibited; heavy use must move to another provider | Inherited compliance item. The host sees every visitor's tile requests down to zoom 19, so FR-14.11.c applies to it today; the M5 privacy notice must name it. E0 changes nothing here and does not exempt it. Packs cannot include these tiles; see PRD OD-11. |

## Development and verification tools

| Item | Version | Purpose | Licence | Notes |
|---|---|---|---|---|
| Playwright (`@playwright/test`) | 1.63.0, pinned exactly in `app/package.json` (dev dependency); Chromium 153.0.8010.12, Playwright browser build 1243, installed per machine with `npx playwright install chromium` | Scripted map benchmark path (`docs/benchmarks/map-migration-method.md`; `app/e2e/benchmark/`) and the differential smoke test (ticket 10) | Apache-2.0 | Added 2026-09-16 (ticket 09). Chromium only: the script uses the Chrome DevTools Protocol for cache flags, throttling and remote debugging of Android Chrome. Runs on demand (`npm run benchmark:map`), not in `npm test`. Its type definitions need `skipLibCheck` under TypeScript 4.2 (`app/e2e/tsconfig.json`). Alternatives: Lighthouse (no tile-latency on a pan path, no phone); manual timing (not reproducible). |
