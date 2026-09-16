# ADR-0026: Use @vis.gl/react-maplibre as the React binding for MapLibre GL

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.1, FR-9.5, P8
- Related ADRs: ADR-0009, ADR-0018

## Context

The current map is twelve declarative layer components rendered as children of react-leaflet's
`MapContainer` (`app/src/frontend/map/`), plus two controls that use the `useMap` hook (geolocation,
search pins). MapLibre GL is an imperative library; something must own the map instance, add and remove
sources and layers as React state changes, and expose the map to controls. The app runs React 17.0 and
TypeScript 4.2 (`app/package.json`). FR-9.4 later renders results with deck.gl or MapLibre GeoJSON sources.

## Decision

Use `@vis.gl/react-maplibre`, the MapLibre-specific binding maintained by the vis.gl team (the same
organisation as deck.gl). Its `Map`, `Source`, `Layer` components and `useMap` hook let the port keep the
same shape as the existing layer components, which keeps the diff readable for `colouring-core` reviewers
(P8). Version, licence and peer ranges are recorded in `docs/tools/inventory.md` when pinned.

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| `react-map-gl` with the `/maplibre` entry point | The older, widely used package from the same team. | Carries Mapbox-era API and typings; its maintainers direct MapLibre users to `@vis.gl/react-maplibre`. |
| Hand-rolled context and hooks over `maplibre-gl` | No binding dependency. | Every layer component would manage `addSource`/`addLayer`/`removeLayer` lifecycles and style-load races itself, which is exactly what bindings exist to get right; more code to review. |
| Do nothing (stay on react-leaflet) | No migration. | Contradicts ADR-0009. |

## Consequences

- Positive: declarative layers; `useMap` for controls; a straightforward path to deck.gl later.
- Negative / to verify at implementation: the package's peer range for React 17 and its typings against
  TypeScript 4.2. If the React 17 / TypeScript 4.2 peer check fails, use `maplibre-gl` directly behind a
  thin component wrapper; no framework upgrade within E0. Record the outcome in the inventory.
- Rules out: mixing bindings; every MapLibre layer goes through this package.

## Implementation notes

- Entry: replace `MapContainer` in `app/src/frontend/map/map.tsx` behind the map-stack flag; the Leaflet
  tree stays untouched until retirement.
- Verify: `npm run build` and `npm test` pass; parity checklist items for each layer component.

## Plain-English summary

The new map library needs a small adapter so the app's React code can declare "show this layer" and have
the map keep up. We use the adapter published by the team that also makes deck.gl, so the code looks like
what is there now and the later result-drawing work fits on top.
