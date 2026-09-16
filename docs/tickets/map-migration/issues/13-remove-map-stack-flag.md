# Remove the map-stack flag and the Leaflet/Mapnik stack

Status: spec-complete
Type: task
Blocked by: 12
Spec: docs/tickets/map-migration/PRD.md (decisions 1, 3, 4; Out of Scope)
Requirements: FR-9.1; ADRs: ADR-0009, ADR-0018, ADR-0027

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

After gate 2, the switch is gone and MapLibre is the only map. Remove the `MAP_STACK` environment default, the
`?map=` query override and its cookie, the active-stack indicator and switch link in the layer-options panel, the
Leaflet map tree and its dependencies, the Mapnik tile server and its dependency, the tile-cache expiry call in
the building edit service, the tile-cache settings (`TILECACHE_PATH`, `CACHE_TILES`, `CACHE_DATA_TILES`), the
historic map and historic data layers, and the differential smoke test (ticket 10). Provisioning no longer installs
Mapnik build dependencies. The layer-options panel keeps showing the archive "as of".

## Acceptance criteria

- [ ] No reference to `react-leaflet`, `leaflet`, `mapnik` or `/tiles/` routes remains in the application source.
- [ ] `npm run build`, `npm test` and `npm run lint` pass; the Playwright benchmark script still runs on the
      single stack.
- [ ] Editing a building still shows the change on the map without reload (edits-since overlay).
- [ ] Inventory rows for Leaflet, react-leaflet and Mapnik retired; `CHANGELOG.md`, the feature doc and the M5
      notice items updated (the cookie no longer exists); provisioning updated.
- [ ] Ecosystem templates no longer mention the tile-cache settings.

## Blocked by

- `docs/tickets/map-migration/issues/12-default-flip-and-soak-gate-2.md` (gate 2 signed off, soak complete).
