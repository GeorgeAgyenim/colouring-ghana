# ADR-0019 — Remove the London map layers and lazy-load boundary GeoJSON

Date: 2026-09-16. Status: accepted. Accepted by George (GeorgeAgyenim), product owner, 2026-09-16.
Formerly `docs/adr/0001`; moved to `docs/decisions/` as ADR-0019 on 16 September 2026. Body unchanged.

## Context

Colouring Ghana is a fork of Colouring London. The map inherited seven London-only
overlay layers (conservation areas, City of London parcels, flood zones, boroughs,
protected vistas, housing zones, creative enterprise zones) plus a switcher button and
a display-preference state for each, and inline "Click to see Flood Zones mapped"
buttons inside three building data containers.

Every layer component fetched its GeoJSON in a `useEffect(..., [])` on mount,
regardless of whether the layer was toggled on. Measured cost per map visit:

| File | Size |
|---|---|
| conservation_areas.geojson | 41 MB |
| parcels_city_of_london.geojson | 6.2 MB |
| flood_zones_simplified.geojson | 3.9 MB |
| boroughs.geojson | 2.0 MB |
| vistas, creative zones, housing zones | ~0.4 MB |

About 54 MB of data for a country the data does not cover, downloaded before the user
touches anything. The two new Ghana layers (regions 1 MB, districts 6.4 MB) copied the
same eager pattern, and were near-identical copies of each other.

## Decision

1. Delete the seven London layers, their switchers, their state in
   `displayPreferences-context.tsx`, their GeoJSON files and the inline toggle buttons
   in `planning-conservation.tsx`, `land-use.tsx` and `water-green-infrastructure.tsx`.
   Also delete `borough-label-layer.tsx` (unwired) and the London exhibition PDF.
2. Replace `region-boundary-layer.tsx` and `district-boundary-layer.tsx` with a single
   `layers/admin-boundary-layer.tsx` that takes URL, name property, label class, zoom
   rule and style as props, and exports `RegionBoundaryLayer` and
   `DistrictBoundaryLayer` as thin wrappers. Replace the two switchers with
   `boundary-switcher.tsx` on the same pattern.
3. Fetch GeoJSON only the first time a layer becomes `'enabled'`, keep it in state
   after that, log fetch failures with the URL, and allow a retry on the next enable.
   The city boundary (280 KB, always shown) stays eager but now has a `.catch`.

## Consequences

- Nothing is downloaded until a user toggles a boundary layer. Region and district
  data is fetched once per page load at most.
- Dropping the `*SwitchOnClick` context members for region/district removed dead API
  surface. `resetLayersAndHideTheirList` and `anyLayerModifiedState` went with them;
  neither had a caller since commit 0b9d96e.
- Toggling a layer off and on re-parses the cached GeoJSON into Leaflet layers
  (react-leaflet unmounts the `<GeoJSON>`). Acceptable for 261 districts; revisit if a
  denser layer is added.
- If a future Ghana overlay is needed, add a wrapper in `admin-boundary-layer.tsx`
  rather than a new copy of the component.

## Rejected

- **Keep the London layers but lazy-load them.** They can never show anything useful
  for Ghana, and keeping them preserved 54 MB of tracked assets and ~600 lines of
  dead UI. Removal is reversible through git history if a comparable Ghana dataset
  appears.
- **Cache parsed Leaflet layers across toggles** (keep the `<GeoJSON>` mounted and hide
  it). Adds lifecycle complexity for a toggle that takes well under a second today.
- **Move the boundary files to the tile server.** Correct long-term for very large
  layers, but the remaining files are 7.6 MB total and the tile pipeline is
  Mapnik-based and building-centric; out of scope for a cleanup.
