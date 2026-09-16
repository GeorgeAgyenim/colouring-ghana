# ADR-0024: One nightly export transaction feeds both the tile archive and the analysis snapshot, and writes a manifest last

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-8.2, FR-8.3, FR-9.2, FR-10.2, FR-10.6, NFR-2.5, P5
- Related ADRs: ADR-0009, ADR-0010, ADR-0018, ADR-0022, ADR-0023, ADR-0025

## Context

Two static artefacts describe the same buildings: the PMTiles archive the map draws (ADR-0009, ADR-0023)
and the GeoParquet snapshot the analysis engine reads (ADR-0010, FR-8.1). Principle P5 stamps every answer
with the snapshot "as of" time. If the two artefacts were produced by two database reads at slightly
different moments, a result view could highlight a building the tiles do not yet show, or vice versa, and
the "as of" on the answer would not describe what is on screen.

ADR-0018 requires the map migration (E0) to be deliverable before the data-delivery milestone (M1), so the
export job must be built in E0 without settling M1's open decisions (OD-6: space-filling-curve and row-group
sizing).

NFR-2.5 says generation must never block contributors and names "read replica or low-priority connection
with statement timeout" as the mechanism. A short statement timeout on a full-table read would abort the
export once the data grows (Greater Kumasi is expected at hundreds of thousands of footprints), which is
the opposite of the intent.

## Decision

One scheduled **export job** does one read: it opens a `REPEATABLE READ` transaction, records `now()` from
inside it as the snapshot "as of" time, and exports the buildings table (all columns, with geometry) once,
to FlatGeobuf. Every published artefact is derived from that one export: in E0 the PMTiles archive
(ADR-0025); in M1 the GeoParquet snapshot, converted from the same FlatGeobuf so it inherits the same
"as of". Artefacts are written to a temporary path and renamed into place; a **manifest** (snapshot
timestamp, artefact list with checksums, layer versions, tool versions) is written last, so a reader that
finds a manifest can trust every file it lists. The job runs under a dedicated read-only export role with a
generous timeout, at reduced CPU and I/O priority (`nice`/`ionice`), in a quiet window; no short statement
timeout is applied to it. NFR-2.5's mechanism text is refined accordingly.

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Separate tile and snapshot jobs | Each epic owns its own job; simplest ownership. | Two reads at different times break P5; a result view could disagree with the tiles. |
| Separate jobs sharing a timestamp table | Each job pins its transaction to a recorded time. | PostgreSQL cannot start a transaction at an earlier snapshot unless that snapshot was exported and is still held open; fragile. |
| E0 also emits GeoParquet | One more ogr2ogr call in E0. | Forces E0 to settle OD-6 and grows the migration PR that core reviewers will study (ADR-0018). |
| Statement timeout on the export role | Follow NFR-2.5's wording literally. | Kills the export as data grows; the requirement's intent is only that contributors are never blocked. |

## Consequences

- Positive: one "as of" for everything a visitor sees; one job to schedule and monitor; the manifest is what
  packs (FR-10.2) and the freshness check (FR-10.6) read; the edits-since overlay (ADR-0022) reads its
  cut-off from the same manifest.
- Negative: the FlatGeobuf intermediate is kept on disk (tens of MB at Kumasi scale); the job's run window
  must be chosen against real contribution patterns (Unknown — to be confirmed by the product owner).
- Rules out: any second read of the buildings table for a published artefact.
- Follow-up: amend NFR-2.5 wording in the PRD when it is next revised; M1 ticket "GeoParquet from the
  export FlatGeobuf" plugs into this job; observability for a failed or stale export (the overlay grows
  until fixed).

## Implementation notes

- Transaction: `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT now();` then the export query in the
  same session. With ogr2ogr this means driving the read from a single `psql`/`COPY` or a script that holds
  the session, not a plain `PG:` connection string per call (each ogr2ogr invocation opens its own
  transaction). See ADR-0025 for the tool chain.
- Manifest: JSON, versioned schema, written last; fields: `as_of`, `format_version`, `artefacts[{path,
  bytes, sha256}]`, `tools{gdal, tippecanoe}`, `layer_versions`. Spec lives in `docs/specs/` per the epic guide.
- Verify: the `as_of` in the manifest equals the value stamped in the PMTiles metadata and, once M1 lands, the
  GeoParquet file metadata.

## Plain-English summary

Every night one job reads the buildings table once, notes the exact moment it did so, and builds every
published file from that single reading: the map tiles now, the analysis snapshot later. A small manifest
file, written last, lists what was built, when, and with which tools, so anything that reads the files can
check they belong together. The job runs quietly in the background and is never allowed to slow down
people who are editing.
