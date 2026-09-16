# Remove the map-stack feature flag and the Leaflet/Mapnik stack

Status: needs-triage
Type: task
Blocked by: FR-9.5 parity checklist passing in production and the agreed soak period completing (see the
map-migration spec, `docs/tickets/map-migration/PRD.md`, once written)

Created 2026-09-16 during `/grill-with-docs` at the product owner's request, so that the switch introduced by
FR-9.1 does not outlive its soak. `/to-tickets` will slot the remaining tickets around it.

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Requirements: FR-9.1 (retire Mapnik after parity and soak).

## What to build

Remove the `MAP_STACK` environment default, the `?map=` query override and its cookie, the "active stack"
indicator in the layer-options panel, the Leaflet map tree (`react-leaflet`, `leaflet`), the Mapnik tile
server (`app/src/tiles/`, `mapnik`), the tile-cache expiry call in the building edit service, and the
`TILECACHE_PATH`, `CACHE_TILES` and `CACHE_DATA_TILES` settings. Update `docs/tools/inventory.md`
(retire rows), `CHANGELOG.md`, the feature doc and the M5 privacy notice (the cookie no longer exists).

## Acceptance criteria

- [ ] No reference to `react-leaflet`, `leaflet`, `mapnik` or `/tiles/` routes remains in `app/`.
- [ ] `npm run build`, `npm test` and `npm run lint` pass in `app/`.
- [ ] Editing a building still shows the change on the map without reload (ADR-0022 overlay).
- [ ] Inventory, changelog, feature doc and privacy notice updated; provisioning no longer installs Mapnik
      build dependencies.

## Blocked by

- FR-9.5 parity checklist passed in production; soak period complete (recorded in the feature doc with dates).
