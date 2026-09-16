# Edits-since endpoint: buildings edited since a timestamp, public attributes only

Status: spec-complete
Type: task
Blocked by: 01
Spec: docs/tickets/map-migration/PRD.md (decisions 25, 31; seam 3)
Requirements: FR-9.3, NFR-2.6, NFR-3.4; ADRs: ADR-0021, ADR-0022, ADR-0023

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A client can ask the server for every building edited since a moment in time and get back only what the map needs
to draw it. `GET /api/buildings/edited-since?after=<ISO 8601>` returns a GeoJSON FeatureCollection of buildings
whose latest revision timestamp is at or after `after` (inclusive `>=`), each with `building_id`, the styled
attribute set derived from the style config (ticket 01), `location_number` and a `demolished` flag; never a
username, user id or revision metadata. An unparseable `after` gives 400. A row cap is enforced server-side and
reported in the response (`truncated` and the cap value); a short per-query statement timeout applies; the
response carries a short `Cache-Control` TTL so repeated requests for the same `after` are cacheable.

The service is separated from its data access the way the edit-history service is, so the rules are tested with
the data access mocked.

## Acceptance criteria

- [ ] jest (node environment, data access mocked): row cap enforced and reported; timestamp validation gives 400;
      inclusive `>=` boundary at the cut-off; `demolished` flag present for buildings with a demolition date; no
      username or contributor identity in any output field.
- [ ] Manual check against the dev database: after editing one building, a request with `after` set just before
      the edit returns that building with its new attribute values and geometry.
- [ ] Response headers show the short TTL; the statement timeout and the cap are named constants recorded in the
      feature doc.
- [ ] Endpoint mounted on the buildings router; module header cites FR-9.3, ADR-0022; `CHANGELOG.md` updated.

## Blocked by

- `docs/tickets/map-migration/issues/01-style-config-expressions-and-legend.md` (attribute list).
