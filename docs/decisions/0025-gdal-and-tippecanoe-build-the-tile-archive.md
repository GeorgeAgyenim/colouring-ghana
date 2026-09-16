# ADR-0025: GDAL (ogr2ogr) exports the buildings; tippecanoe builds the PMTiles archive

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.2, FR-8.3, NFR-1.5
- Related ADRs: ADR-0009, ADR-0023, ADR-0024

## Context

ADR-0024 fixes the shape of the export job: one read to FlatGeobuf, then derived artefacts. A tool is needed
to turn the FlatGeobuf into a PMTiles archive with sensible simplification and feature dropping at low zooms
(the map shows zoom 7 to 19). GDAL is already installed on the VM (`gdal-bin` in `provision/vm_provision.sh`);
the development machine has GDAL 3.4.1 with FlatGeobuf and MVT drivers but no Parquet driver. The production
VM's GDAL version is Unknown — to be confirmed by the maintainer.

## Decision

`ogr2ogr` writes the export to FlatGeobuf. `tippecanoe` (the Felt fork) reads that file and writes the
PMTiles archive directly, with per-zoom simplification, small-feature dropping below the zoom where
buildings are legible, and the property list restricted to the styled attributes (ADR-0023). Both are
recorded in `docs/tools/inventory.md`. M1 will need GDAL 3.9 or newer for the GeoParquet step (Parquet
driver from 3.5, bounding-box sorting from 3.9); that upgrade belongs to M1, not E0.

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| ogr2ogr MVT driver, then `pmtiles convert` | GDAL alone writes MBTiles or a tile directory; the pmtiles CLI packs it. | Two steps and an intermediate MBTiles; GDAL's simplification and dropping controls are cruder than tippecanoe's. |
| Planetiler | Java pipeline built for OpenStreetMap basemaps. | Needs a JVM and a custom Java profile for a non-OSM source; heavy for a single polygon layer. |
| Node script (geojson-vt, vt-pbf) | Stay in the app's language. | No mature PMTiles writer in JavaScript; the whole dataset would sit in the API process's memory. |
| Do nothing (keep Mapnik) | No archive. | Contradicts ADR-0009. |

## Consequences

- Positive: proven tools, single binaries, permissive licences (GDAL MIT/X, tippecanoe BSD-2); tippecanoe's
  `--extend-zooms-if-still-dropping` and `-zg` options handle Kumasi-scale growth without retuning.
- Negative: tippecanoe is built from source on the VM (no Ubuntu package for the Felt fork); provisioning
  script and inventory must pin a version.
- Defers: GDAL upgrade to M1.

## Implementation notes

- Export: `ogr2ogr -f FlatGeobuf buildings.fgb PG:"…" -sql "<styled-column select>"` driven from the
  session that holds the REPEATABLE READ transaction (ADR-0024); geometry in EPSG:4326.
- Tiles: `tippecanoe -o buildings.pmtiles -l buildings -Z7 -z16 --drop-smallest-as-needed
  --simplification=… -y building_id -y <attribute…> buildings.fgb`; MapLibre overzooms 16 to 19.
  Exact zoom and drop settings are benchmarked in `docs/benchmarks/` against NFR-1.5.
- Verify: `pmtiles show buildings.pmtiles` reports the expected layer, zoom range and property keys;
  the parity checklist compares rendering at zooms 9, 12, 14, 17 and 19.

## Plain-English summary

Two standard open-source tools do the nightly build. GDAL, already on the server, copies the buildings out of
the database into a compact file. Tippecanoe turns that file into the single map-tile file the new map
reads, thinning detail at country scale so the file stays small. Both are free and widely used.
