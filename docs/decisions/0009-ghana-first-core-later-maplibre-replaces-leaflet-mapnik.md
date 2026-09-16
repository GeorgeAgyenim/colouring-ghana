# ADR-0009: Replace the current map technology: MapLibre with vector tiles instead of Leaflet with Mapnik raster tiles; Ghana first, then contribute to the core platform

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9, P8
- Plain-English record: docs/Design-Decisions-Plain-English.md — D11, D15

## D11 — Replace the current map technology: MapLibre with vector tiles instead of Leaflet with Mapnik raster tiles

### Context

Map 'tiles' are the small squares a web map is assembled from. 'Raster' tiles are pictures — once drawn, they cannot be restyled. 'Vector' tiles carry the shapes themselves, so the browser can colour and highlight them instantly, which is exactly what showing a query result needs.

Mapnik is the software that currently draws the picture tiles on the server; the product owner reports it is slow. Leaflet and MapLibre are the two browser map libraries; MapLibre is built for vector tiles and large numbers of shapes.

'PMTiles' is a way of storing all of an area's tiles in one file that can be read in small pieces without a tile server. It also makes offline maps possible (D13).

The product owner considered using GeoParquet for rendering. GeoParquet is the right format for the analysis data (D12), but it is not a tiling scheme: a visitor panning across all of Ghana cannot be handed the whole country as one file. Tiles serve browsing; GeoParquet serves analysis; for a district-sized area the same GeoParquet file can also be drawn directly.

### Decision

The map moves from Leaflet drawing pre-rendered picture tiles (made by a program called Mapnik) to MapLibre GL drawing 'vector tiles'. The base map comes from PMTiles files generated nightly; when online, a live tile service may add the newest edits on top. Query results are drawn in the browser from local data. Mapnik is retired once the new map matches the old one feature for feature.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Keep Leaflet, overlay results as GeoJSON | Minimal change to the existing map. | Leaflet handles tens of thousands of restyled shapes poorly; still dependent on slow Mapnik for the base. |
| Keep Mapnik, just add a cache | Speed up the existing pipeline. | Does not solve client-side restyling or offline; keeps a slow component. |
| Live vector tiles only (Martin or pg_tileserv) | Serve tiles directly from the database on demand. | Needs a connection at all times; no offline. Retained as the optional 'fresh edits' layer on top of PMTiles. |
| GeoParquet only | Render everything from the analysis files. | Not a tiling scheme; cannot support browsing the whole country. |

### Rationale

- Rendering speed was an explicit pain point.
- Query results must be drawn and restyled instantly in the browser.
- PMTiles are what make offline maps possible.
- This is the part of the work `colouring-core` will find hardest to adopt, and the product owner accepted that trade-off under 'Ghana first, core later' (D15).

### Consequences

- Depends on: A written parity checklist so that existing behaviour (colour schemes, legends, selecting and editing buildings) is preserved.

## D15 — Ghana first, then contribute to the core platform

### Context

'colouring-core' is the shared codebase that every Colouring Cities platform is copied ('forked') from. Contributing back means offering our changes to be merged into that shared codebase.

Portable parts: the plan format and its compiler, the snapshot exporter and format, the pack format and offline layer, the engine integration, and the map migration. Ghana-specific parts: the reference layers, the data definitions, the assistant's prompts and grounding material, and the privacy notice.

### Decision

Build and prove the analytical platform on the Colouring Ghana instance. Once it works very well, contribute the portable parts to `colouring-core` so other CCRP countries can use them.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Build directly in colouring-core | Develop as a core feature from the start. | Slower; requires consensus with all partners on every choice; the map-stack change would be contentious before it is proven. |
| Never contribute | Keep it Ghana-only. | Contrary to the programme's purpose of shared, interoperable platforms. |

### Rationale

- Speed and the freedom to be opinionated while proving the idea.
- Separating portable from Ghana-specific code from the start keeps the later contribution feasible.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

The map moves from Leaflet drawing pre-rendered picture tiles (made by a program called Mapnik) to MapLibre GL drawing 'vector tiles'. The base map comes from PMTiles files generated nightly; when online, a live tile service may add the newest edits on top. Query results are drawn in the browser from local data. Mapnik is retired once the new map matches the old one feature for feature. Build and prove the analytical platform on the Colouring Ghana instance. Once it works very well, contribute the portable parts to `colouring-core` so other CCRP countries can use them.
