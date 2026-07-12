# Location search

Technical documentation for the map location search feature in Colouring Ghana:
searching for towns, streets, building names and GhanaPost GPS addresses, and the
data that powers it.

## Purpose

The search bar (top-left of the map) lets a user find a place and move the map to it.
The frontend and API were inherited fully wired from the UK parent project, but the
backing table (`search_locations`) was empty — it had been populated from UK Ordnance
Survey postcodes, which do not apply to Ghana. This feature populates search with
Ghana-relevant data and adds the interaction needed to disambiguate results.

## Architecture overview

Search draws on **two independent data sources**, because the two kinds of thing a user
searches for have fundamentally different provenance:

| Search class | Source | Why |
|---|---|---|
| `town` | GeoNames gazetteer (`reference_tables.places`) | Authoritative list of ~16k Ghanaian settlements. Independent of contributions, so a town is findable even if nobody has edited a building there. |
| `name`, `gps`, `street` | Building contributions (`buildings` table) | Nothing external knows a specific building's public name or GhanaPost GPS address — only contributors do. |

Both sources are indexed into the single `search_locations` table, which the search API
queries with PostgreSQL trigram (`pg_trgm`) fuzzy matching. The frontend consumes the
results as a list the user picks from, with a pin per result on the map.

```
                        ┌─────────────────────────┐
 GeoNames GH export ───▶│ reference_tables.places │──┐
 (etl/load_geonames_    └─────────────────────────┘  │  seed
  places.sh)                                          ▼  (etl/load_search_locations.sql)
                        ┌─────────────────────────┐  ┌────────────────────┐   /api/search   ┌───────────┐
 buildings (name, ─────▶│ real-time sync on edit  │─▶│  search_locations  │───(trigram)────▶│ search box│
  gps, street)          │ (searchSync.ts) + ETL   │  └────────────────────┘                 │  + pins   │
                        └─────────────────────────┘                                          └───────────┘
```

## Data model

### `reference_tables.places` (migration 062)
The GeoNames "populated place" (`feature_class = 'P'`) records for Ghana. Loaded by
`etl/load_geonames_places.sh`. Key columns: `geonameid` (PK), `name`, `asciiname`,
`alternatenames` (comma-separated variant spellings), `latitude`/`longitude`,
`admin1_code` + `admin1_name` (region), `feature_code` (settlement type), `population`.
Trigram GIST indexes on `name` and `asciiname` support fuzzy autofill/search.

### `buildings.location_gps_address` (migration 061)
A per-building GhanaPost GPS digital address (format `AA-NNN-NNNN`, e.g. `GA-183-9385`).
Editable and verifiable in the building sidebar (Location → Individual Building/Property
Address). Indexed into `search_locations` as class `gps`.

### `search_locations.building_id` (migration 063)
Nullable FK to `buildings`. `NULL` for `town` rows (from GeoNames) and `street` rows
(aggregates over many buildings); **set** for `name`/`gps` rows so the real-time sync can
target exactly one building's rows. Matching by `search_str` instead would wrongly delete
a different building that happens to share a name.

## Search index contents (`search_locations`)

Rebuilt by `etl/load_search_locations.sql`. Row types:

- **`town`** — one row per GeoNames place, plus extra rows for each alternate spelling.
  `search_str` is region-qualified (`"Nyamebekyere, Ashanti Region"`) so homonyms are
  distinguishable. `zoom` is derived from `population` (big city → lower/further-out zoom).
- **`name`** — one row per building with a public name. `zoom` 18. Carries `building_id`.
- **`gps`** — one row per building with a GhanaPost GPS address. `zoom` 18. Carries `building_id`.
- **`street`** — one row per `(street, town)` aggregate of buildings. `zoom` 16.

## Search interaction (frontend)

`app/src/frontend/map/search-box.tsx`, `map.tsx`, `search-results-layer.tsx`.

Homonyms are common in Ghana (GeoNames has "Nyamebekyere" 66× across 7 regions), so search
**shows candidates to verify** rather than guessing one:

1. User submits a query → `GET /api/search?q=…` returns up to 5 trigram-ranked matches.
2. The map **fits its bounds to all results** and drops one **teardrop pin** per result
   (deliberately distinct from the geolocation control's directional-arrow marker).
3. A **results dropdown** lists the region-qualified labels. **Hovering** a row pops out its
   pin (larger, darker, raised); **clicking** flies the map to that place at its stored zoom
   and clears the other pins.

Spelling tolerance comes from two layers: GeoNames `alternatenames` are indexed (known
variants), and `pg_trgm` fuzzy matching absorbs typos.

**Mobile:** the pattern degrades gracefully. Pins, fit-to-bounds and tap-to-select all work
on touch; the hover "pop-out" is a pointer-only enhancement (mouse-enter events are inert on
touch), so no separate mobile interaction exists.

## Town editing (autofill)

The building `location_town` field is an **autofill dropdown** sourced from GeoNames
(`app/src/frontend/building/data-containers/location.tsx` with `autofill={true}`, backed by
`getPlaceOptions` in `app/src/api/services/autofill.ts` → `/api/autofill`). It is a
suggestion layer over a normal text input, so **free-text entry is still allowed** when a
place is not listed. The building stores the region-qualified string (e.g.
`"Kumasi, Ashanti Region"`). This replaced free-text town entry, which fragmented the data
(e.g. "Adumasa" vs "Adumase").

## Freshness / operations

- **Town data is static.** GeoNames is reference data; re-run `etl/load_geonames_places.sh`
  only to refresh from GeoNames itself.
- **Building name/GPS rows sync in real time.** On a building edit that changes
  `location_name` or `location_gps_address`, `editBuilding` calls
  `syncBuildingSearchLocations(buildingId)` (`app/src/api/services/building/searchSync.ts`)
  post-commit — so a newly recorded name/GPS is searchable immediately, no ETL needed. This
  is fire-and-forget and failures are logged, never rolled back into the user's edit.
- **`etl/load_search_locations.sql` is the full rebuild / backfill path.** It `TRUNCATE`s
  and rebuilds the whole index. Re-run it after **bulk** building imports or demolitions
  (which write directly to the DB and bypass the app-layer sync), and note it must run
  **after** the GeoNames load, not before.

## Setup / runbook

Run from the repo root with the same `PG*` environment the other ETL scripts use.

```bash
cd /home/george/Dev/colouring-ghana

# 1. Apply migrations, in order (062 creates places; 063 adds search_locations.building_id)
psql < migrations/061.location-gps-address.up.sql
psql < migrations/062.geonames-places.up.sql
psql < migrations/063.search-locations-building-ref.up.sql

# 2. Grant the app role the new privileges (replace <appusername> with the app's DB role;
#    skip if the app connects as the DB owner/superuser)
psql -c "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE search_locations TO <appusername>;"
psql -c "GRANT SELECT ON TABLE reference_tables.places TO <appusername>;"

# 3. Download + load GeoNames populated places for Ghana (needs internet, curl, unzip)
bash etl/load_geonames_places.sh

# 4. Build the search index (GeoNames towns + building name/gps/street)
psql -f etl/load_search_locations.sql
```

Prerequisite: the `pg_trgm` extension must exist (part of the original DB setup in
`migrations/README.md`). If migration 062 fails with `operator class "gist_trgm_ops" does
not exist`, run `psql -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"` first.

### Expected output / verification

```bash
# ~15,997 populated places
psql -c "SELECT count(*) FROM reference_tables.places;"
#  count
# -------
#  15997

# index populated by class
psql -c "SELECT search_class, count(*) FROM search_locations GROUP BY search_class ORDER BY search_class;"
#  search_class | count
# --------------+-------
#  gps          |   ...
#  name         |   ...
#  street       |   ...
#  town         |   ...

# a homonym returns several region-qualified rows
psql -c "SELECT search_str, zoom FROM search_locations WHERE search_str ILIKE 'nyamebekyere%' LIMIT 10;"
```

End-to-end: in the app, type a town name → the results dropdown lists candidates and the map
frames all pins; hover a row → its pin pops; click → the map flies there. Edit a building's
GPS address, save, then search that code → it resolves immediately (no ETL run).

## Key design decisions (and rejected alternatives)

- **Towns from GeoNames, not from building contributions.** An earlier approach aggregated
  town centroids from edited buildings. Rejected: it has a chicken-and-egg flaw — a town
  nobody has edited can never be found — and free-text town entry fragments the data.
- **Store the region-qualified town string, not the GeoNames ID.** Rejected the ID because
  it would require changing the autofill component to store an id while displaying a label,
  a null-id path for the free-text fallback, and a fuzzy migration of existing values. The
  string keeps the existing autofill + free-text fallback working unchanged. ID storage
  remains a possible future upgrade for exact homonym pinning.
- **Show a results list + verify, not a single best guess.** Given how common homonyms are,
  jumping straight to the top match would silently land on the wrong place. Fit-to-bounds +
  per-result pins + hover-preview lets the user resolve it spatially.
- **Real-time sync in the app layer (not DB triggers).** The project has no DB triggers and
  keeps denormalised data in sync in application code (e.g. `likes_total`); this follows that
  convention and keeps the logic testable and visible. A direct table `GRANT` was chosen over
  a `SECURITY DEFINER` function because the app role already writes to several tables, so this
  is consistent and simpler.
- **No town polygons / snap-to-features.** Considered drawing a boundary around each town's
  buildings snapped to roads/rivers/admin boundaries. Rejected as a large computational-
  geometry effort with only cosmetic payoff — navigation needs only a centre + zoom.
- **GhanaPost GPS: stored codes only (no external API).** The official GhanaPostGPS API needs
  registered/paid credentials. v1 resolves only codes recorded on buildings; an API resolver
  for arbitrary codes is a future phase.

## Failure modes

- **Search returns nothing for a known town.** `reference_tables.places` may be empty (step 3
  not run) or the index not rebuilt (step 4). Check the two verification queries above.
- **A newly entered name/GPS isn't searchable.** The real-time sync is post-commit and
  fire-and-forget; check the server log for `Failed to sync search_locations for building …`.
  Re-running `etl/load_search_locations.sql` will backfill it regardless.
- **Demolished/bulk-imported buildings look stale in search.** Bulk ETL (geometry loads,
  `mark_demolitions.sh`) bypasses the app-layer sync. Re-run `etl/load_search_locations.sql`
  after any bulk operation.
- **Migration 062 fails on `gist_trgm_ops`.** `pg_trgm` extension missing — see prerequisite
  above.
- **`load_geonames_places.sh` fails to download.** It fetches `GH.zip` and
  `admin1CodesASCII.txt` from `download.geonames.org`; requires outbound internet, `curl` and
  `unzip`. Files are cached under `etl/geonames_gh/`, so a re-run reuses them.

## Attribution

Place/town names derive from the [GeoNames geographical database](https://www.geonames.org),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This is credited to
users on the Download data page (`app/src/frontend/pages/data-extracts.tsx`) and in the search
results dropdown footer.
