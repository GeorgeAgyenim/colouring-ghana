# Map-stack flag and the MapLibre map shell with the OSM basemap

Status: spec-complete
Type: task
Blocked by: none
Spec: docs/tickets/map-migration/PRD.md (decisions 1 to 3, 5, 17 to 20, 30; seam 4)
Requirements: FR-9.1, FR-9.5, FR-14.11.c, P8; ADRs: ADR-0018, ADR-0026, ADR-0027

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A tester adds `?map=maplibre` to any page and gets a MapLibre map in place of the Leaflet one: the OpenStreetMap
raster basemap at the same URL and attribution, the initial viewport from site config, minimum zoom 7, maximum 19,
zoom control, light and night themes (night via raster paint properties, background colours as today). The choice
sticks in a functional cookie across pages; without it the environment default (`MAP_STACK`, default `leaflet`)
applies. The layer-options panel shows the active stack and a link to the other one. Everyone else still sees the
Leaflet map, untouched.

Flag resolution is one pure function of environment default, query parameter and cookie, used by both the server
render (environment default injected through the preloaded state) and the client, so they never disagree.

Before any layer is written, verify `@vis.gl/react-maplibre` against React 17 and TypeScript 4.2. If the peer check
fails, use a thin component wrapper over `maplibre-gl` with no framework upgrade (ADR-0026), and record the outcome
in the inventory.

Creates, if absent, `docs/features/map-migration.md` and `CHANGELOG.md` (see ticket 01; whichever lands first).

## Acceptance criteria

- [ ] jest: environment default applies when nothing else is set; an explicit `?map=` sets the cookie and wins for
      that request; the cookie wins over the environment default; server and client resolve identically for the
      same inputs.
- [ ] With `?map=maplibre`: basemap, attribution, initial viewport, zoom limits, zoom control and both themes
      behave as on Leaflet; the choice persists across pages in the same browser; `?map=leaflet` switches back.
- [ ] Without the parameter or cookie, the Leaflet map renders exactly as before; no Leaflet file changes.
- [ ] Layer-options panel shows the active stack and the switch link on both stacks.
- [ ] Peer check outcome and pinned versions of `maplibre-gl`, `pmtiles` and `@vis.gl/react-maplibre` (or the
      wrapper decision) recorded in `docs/tools/inventory.md`.
- [ ] Feature doc privacy section records the notice item for M5: the `?map=` cookie is a functional cookie.
- [ ] `npm test`, `npm run lint`, `npm run build` pass; module headers cite FR-9.1 and ADR-0026; `CHANGELOG.md`
      updated; `CONTEXT.md` already defines map-stack flag.

## Blocked by

- None (can start immediately).
