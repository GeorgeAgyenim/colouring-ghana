# ADR-0023: One PMTiles archive carrying every styled attribute, and one style config that drives both map colours and legend

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.2, FR-9.5, FR-10.2, P8
- Related ADRs: ADR-0009, ADR-0022

## Context

The Mapnik tile server defines 66 tilesets in `app/src/tiles/dataDefinition.ts`, 54 of them category
colourings. Each tileset is a SQL query for one attribute plus a Mapnik XML style. The legend for the same
colouring lives separately in `app/src/frontend/config/category-maps-config.ts` (884 lines). Colour values
are therefore maintained in two places and can drift.

Vector tiles carry feature properties, so the browser can restyle without refetching. The question was
whether to publish one archive with many properties or one archive per category as today. The attribute set
read by all category tilesets is about 40 columns, some drawn from joined tables (for example planning data).
For the pilot's 21,200 footprints this is a few megabytes; for hundreds of thousands of buildings it is tens
of megabytes, which is acceptable for a nightly static file served with range requests.

Packs (FR-10.2) later include "PMTiles for the area"; one archive can be clipped per district with
`pmtiles extract`, whereas 54 archives would mean 54 clips per pack.

## Decision

The nightly export produces **one** PMTiles archive with one vector layer, `buildings`, whose properties are
`building_id` plus every attribute any category colouring reads. Category colourings are **style expressions**
generated from a single TypeScript config that also produces the legend entries, so a colour is defined
once. The Mapnik XML and per-tileset SQL are retired with Mapnik (FR-9.1).

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| One archive per category (54 files) | Mirror today's tilesets one-to-one. | 54 nightly builds, 54 files to host and clip into packs, a refetch on every category switch, and the colour duplication would remain. |
| Geometry-only tiles, attributes joined from the GeoParquet snapshot in the browser | Smallest tiles; colours computed from analysis data. | Makes the migration depend on the M1 snapshot exporter, which ADR-0018 forbids; also makes plain browsing depend on the analysis engine. |
| Keep colours in Mapnik XML and translate at build time | Reuse existing style files. | Mapnik XML cannot express MapLibre expressions; a translator would be more code than the config it replaces. |

## Consequences

- Positive: category switch is instant; one source of truth for colours; the same config can style the
  edits-since overlay (ADR-0022) and, later, the result view; one file to pack.
- Negative: every styled attribute is public in the tile file. This matches today, where every tileset is
  served to anonymous visitors, but the export must be reviewed against the privacy rule before any new
  column is added. Attributes must be re-checked when the Ghana attribute list changes.
- Defers: attribute-level access control in tiles (none exists today either).
- Follow-up: a provenance record for the archive in `docs/data/`; a versioned tile schema note listing the
  properties, so packs and core contribution know what to expect.

## Implementation notes

- Export query: one SELECT joining `buildings` and `geometries` (and the planning table where used),
  restricted to the styled columns plus `location_number` (number labels); output via the export job (ADR-0024) and tools (ADR-0025).
- Style config: extend `category-maps-config.ts` so each map definition holds the attribute name, the value
  to colour mapping (or bands for numeric attributes), and derives both the legend elements and a MapLibre
  `match`/`step` expression. Unit test: every legend colour appears in the generated expression and vice versa.
- Verify: for each of the 54 colourings, screenshot old and new map at the same view and compare in the
  parity checklist.

## Plain-English summary

Instead of drawing 54 separate picture layers on the server, the nightly build writes one file of building
shapes with the handful of facts each colouring needs. The browser colours the shapes itself, so switching
from "age" to "construction material" is instant. The colours are written down once, and both the map and its
legend read from that one list, so they can no longer disagree.
