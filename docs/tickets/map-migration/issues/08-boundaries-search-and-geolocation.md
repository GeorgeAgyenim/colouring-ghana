# Port boundaries, city outline, search pins and the geolocation control

Status: spec-complete
Type: task
Blocked by: 04
Spec: docs/tickets/map-migration/PRD.md (decision 17, 29)
Requirements: FR-9.5, FR-14.11.d; ADRs: ADR-0019, ADR-0026

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

On the MapLibre stack the remaining map furniture behaves as on Leaflet: the city boundary drawn on load; region
and district boundaries toggled from the layer-options panel, each fetched only on first enable and kept, with
region labels at zoom 11 and below and district labels at zoom 12 and above as symbol layers; search results as
drop pins with hover emphasis, single-result recentre at the result's zoom and multi-result framing; the
geolocation control with arrow marker, accuracy circle, compass heading, recentre and error surfacing, and still
no network or storage write.

## Acceptance criteria

- [ ] City boundary visible on load; region and district layers toggle; their GeoJSON is not requested until first
      enable (network capture) and is requested once per page load.
- [ ] Region labels only at zoom ≤ 11; district labels only at zoom ≥ 12; label styling matches the old map.
- [ ] Search: pins for all results, hovered pin emphasised, select recentres at the result's zoom, several results
      framed with padding; pins cleared on select.
- [ ] Geolocation: fix, accuracy circle and heading shown; recentre zooms to the fix; errors shown in the button
      tooltip; a network capture after a fix shows no request carrying coordinates and no storage write
      (FR-14.11.d evidence kept in the feature doc).
- [ ] Layer-options panel opens and closes without resetting selection or toggles.
- [ ] Module headers cite FR-9.5; `CHANGELOG.md` updated.

## Blocked by

- `docs/tickets/map-migration/issues/04-map-stack-flag-and-maplibre-shell.md`.
