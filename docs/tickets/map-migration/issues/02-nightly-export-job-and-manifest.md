# Nightly export job: one transaction, FlatGeobuf, PMTiles archive and manifest

Status: spec-complete
Type: task
Blocked by: 01
Spec: docs/tickets/map-migration/PRD.md (decisions 6 to 12, 15, 31, 33, 34; seam 2)
Requirements: FR-9.2, FR-8.2, FR-8.3, FR-10.2, NFR-1.5, NFR-2.5, NFR-3.4, NFR-3.5, P5; ADRs: ADR-0023, ADR-0024, ADR-0025

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

The maintainer runs one command (later scheduled nightly) and gets a set of files a map can read: a FlatGeobuf
export of the buildings, a single PMTiles archive with one `buildings` layer, and a manifest written last that
lists them with checksums and one "as of" time. The job opens a `REPEATABLE READ` read-only transaction, records
`now()` from inside it, exports once through `ogr2ogr` from that session, builds the archive with tippecanoe (Felt
fork) with the property list restricted to the style config's attribute list (ticket 01) plus `location_number`,
uses `building_id` as the feature id, excludes demolished buildings, writes to a temporary path and renames into
place, and names the archive by its "as of". It runs under a dedicated read-only export role, at reduced CPU and
I/O priority, with a generous timeout and no statement timeout. A failed run leaves the previous manifest in place
and exits non-zero; the previous archive is kept until the next successful run and older ones are deleted. The job
logs start, "as of", feature count, sizes, checksums, duration and exit status.

A small checker script verifies a run against the dev database (seam 2).

## Acceptance criteria

- [ ] Running the job against the dev database produces FlatGeobuf, PMTiles and manifest; the manifest's `as_of`
      equals the transaction timestamp the job recorded and the archive's PMTiles metadata carries the same value.
- [ ] Checker: FlatGeobuf and archive have the same feature count and ids; checksums recompute; archive property
      keys equal the style config's attribute list plus `location_number`; zoom range 9 to 16 and one layer named
      `buildings`; `pmtiles extract` of a district bounding box succeeds without a rebuild.
- [ ] A forced failure (for example an unwritable output directory) leaves the previous manifest and archive
      untouched and exits non-zero.
- [ ] Export role exists with read access only to buildings, geometries, planning data used by colourings and
      reference layers; no access to users or edit-log identity columns.
- [ ] Manifest format written to `docs/specs/` with `format_version`, `as_of`, `artefacts[{path, bytes, sha256}]`,
      `tools`, `layer_versions`, `feature_count`.
- [ ] Provenance record for the archive in `docs/data/` and a versioned tile schema note listing the properties.
- [ ] Provisioning installs a pinned tippecanoe; inventory rows for tippecanoe and GDAL updated (production GDAL
      version confirmed or left "Unknown — to be confirmed by the maintainer"); quiet window recorded or marked
      unknown.
- [ ] Feature doc "How to reproduce results" states the exact command; `CHANGELOG.md` updated; commits cite
      FR-9.2, FR-8.2, FR-8.3, ADR-0024, ADR-0025.

## Blocked by

- `docs/tickets/map-migration/issues/01-style-config-expressions-and-legend.md` (attribute list).
