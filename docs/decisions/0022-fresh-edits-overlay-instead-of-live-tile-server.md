# ADR-0022: Show recent edits with an edits-since overlay instead of a live vector-tile server

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.1, FR-9.3, FR-9.5; resolves PRD OD-5
- Related ADRs: ADR-0009 (MapLibre and PMTiles), ADR-0018 (migration as prerequisite epic), ADR-0023 (one archive, one style config)

## Context

Today an edit to a building is visible on the map within seconds: the save handler calls
`expireBuildingTileCache`, which drops every cached Mapnik tile whose bounding box touches the building, and the
next request re-renders from the database. Contributors rely on this to check their own work.

ADR-0009 moves the base map to PMTiles archives generated nightly. On their own, nightly archives mean an edit
made at 09:00 is not visible until the next morning. The parity requirement (FR-9.5) says the edit workflow
must be preserved, so the migration needs a way to show edits made after the archive's "as of" time.

PRD OD-5 left three options open: Martin, pg_tileserv, or PMTiles only. Martin and pg_tileserv are separate
server processes that render vector tiles from PostGIS on demand. The Ghana instance is deployed as one Node
process under pm2 on one virtual machine; there is no container orchestration and no separate tile host.

Volume: the pilot area has about 21,200 buildings and edits are made by hand, so the set of buildings changed
since the last nightly export is at most hundreds of features, typically far fewer.

## Decision

The base map is the nightly PMTiles archive. On top of it the browser draws an **edits-since overlay**: a
GeoJSON source populated from a new read-only API endpoint that returns the buildings edited since a given
timestamp (the archive's "as of" time), with the same attribute columns as the archive so the same style
expressions apply. The overlay is refreshed after the contributor's own save and on a modest interval while
online. No live vector-tile server is deployed in Version 1. FR-9.3 is satisfied by this overlay; OD-5 is
closed as "PMTiles plus edits-since overlay".

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| PMTiles plus Martin | A Rust tile server beside Express, serving live vector tiles from PostGIS with a cache, layered over the archive. | A second process to provision, monitor and cache-invalidate on a single-VM deployment; the live layer would redraw everything the archive already draws. Freshness gain over the overlay is nil for hand-made edits. |
| PMTiles plus pg_tileserv | Same shape as Martin, Go binary from CrunchyData. | Same operational cost as Martin; less actively maintained. |
| PMTiles only | Edits appear the next day. | Fails FR-9.5 for the edit workflow; contributors could not check their own work. |
| Do nothing (keep Mapnik) | No migration. | Contradicts ADR-0009. |

## Consequences

- Positive: no new server process; the only server change is one read-only endpoint; the overlay design is
  reusable for the result view later (a GeoJSON source styled by the same expressions).
- Negative: the overlay is bounded by "edits since the archive" and grows through the day; if the nightly
  export ever fails, the overlay grows until it is fixed, so the export job needs monitoring
  (see the observability notes in the feature doc).
- Rules out: a live tile server in V1. If edit volume ever makes the overlay large (thousands of features per
  day), revisit with a new ADR; the archive can also be rebuilt more often than nightly (FR-8.3 already
  allows a change-count threshold).
- Follow-up: the endpoint must return public attributes only and must not expose contributor identity
  (CLAUDE.md privacy rule); the client reads the archive's "as of" time from the export manifest
  (ADR-0024), fetched at page load and after each save.

## Implementation notes

- Endpoint: `GET /api/buildings/edited-since?after=<ISO timestamp>` returning a GeoJSON FeatureCollection
  of building geometry plus the styled attribute set defined in ADR-0023. Uses the existing `apiHelpers`
  path (ADR-0021). Paged or capped, with the cap surfaced to the client.
- Client: a MapLibre GeoJSON source and one fill layer per theme using the same style expressions as the
  archive's building layer, ordered above it. Deleted or demolished buildings are handled by including them
  in the response with a flag so the overlay can hide the base feature via feature-state.
- Verify: edit a building on a MapLibre-enabled environment; the new colour appears without reload and before
  any nightly export.

## Plain-English summary

The new map's building shapes and colours come from a file rebuilt every night. Because contributors need to
see their edits straight away, the browser also asks the server for "everything edited since that file was
made", which is a small list, and draws it on top in the same colours. This avoids running a second map
server. It also settles open decision OD-5: no live tile server in Version 1.
