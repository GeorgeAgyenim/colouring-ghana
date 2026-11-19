# Search relevance and index integrity

Status: spec-complete
Type: task
Blocked by: none
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Branch: `fix/location-search-01-search-relevance` off `feature/location-search`
Source: review of the whole branch for problems, 19 November 2026

## Problem

Map search (`GET /api/search`) returns the five stored labels that look most like what was typed, compared
three letters at a time ("trigram distance"), and nothing else decides the order. Measured on the development database (27.8k index rows) on 19 November 2026:

- **No such thing as "no match".** `zzqqxxjj` returns Zobo, Zoba, Zuta, Zawe and Zofe, and the map jumps to
  fit them. The "No matches found" message added to the search box can only appear if the table is empty.
- **Big places lose to small ones.** `kumasi` returns the street "Kumasi-Ejisu, Ejisu" and the village
  "Kumasi, Volta" first; "Kumasi, Ashanti", the country's second city, comes fifth. The region name is part
  of the matched text, so a shorter region name scores higher, and population is ignored.
- **The region is matched as if it were the place.** With word matching, `accra` matches every place whose
  label ends in "Greater Accra".
- **One place takes several slots.** `accra` returns "Accra", "Acra" and "ACC": three spellings of the same
  place, each stored as its own row.
- **The index can drift.** `searchSync.ts` deletes then inserts with no unique key, so two edits to one
  building at the same moment can leave duplicate rows. A building recorded as demolished stays searchable
  until the next full rebuild. `etl/load_search_locations.sh` prints "Done" even when the SQL failed.

## What to build

- `migrations/064.search-locations-ranking.{up,down}.sql`: add to `search_locations` the nullable columns
  `display_label text` (what the person sees), `place_id bigint` (GeoNames id, towns only) and
  `population bigint` (towns only); add a unique index on `(building_id, search_class)` where `building_id`
  is not null. Update `migrations/README.md`.
- `etl/load_search_locations.sql`: for towns, `search_str` is the name or alternate spelling only;
  `display_label` is the primary name plus region; fill `place_id` and `population`.
- `app/src/api/services/search.ts`: rank by word distance (`$1 <<-> search_str`; confirmed to use the
  existing GiST index on PostgreSQL 18.7 with pg_trgm 1.6), drop rows beyond a threshold, keep the best row
  per place, break ties by population and then whole-string distance. Read about 25 candidates from the
  index, re-rank, return 5. Start the threshold at pg_trgm's default word similarity of 0.6 and fix it with
  the test queries below.
- `app/src/api/api.ts`: the label sent to the browser is `display_label`, falling back to `search_str`.
- `app/src/api/services/building/searchSync.ts`: insert with `ON CONFLICT` on the new unique index.
  `app/src/api/services/building/edit.ts`: also run the sync when the demolition fields change.
- `etl/load_search_locations.sh`: `set -euo pipefail` and `psql -v ON_ERROR_STOP=1`, as in
  `etl/load_geonames_places.sh`.
- `docs/location-search.md`: describe the ranking and the new columns.
- An ADR for the ranking choice (kept local, see `docs/decisions/`), with the alternatives set aside:
  a threshold on whole-string distance; full-text prefix search; an external geocoder.

## Load and limits

Built for about 28,000 index rows at about 9 ms per query today. At ten times the rows, the
nearest-neighbour scan on the trigram index is what slows first. The way out is a cheap candidate filter
before ranking. Write that down in the feature doc; do not build it.

`search_locations` is derived data rebuilt by the ETL, so the schema change can be undone with the down
migration and a rebuild.

## Acceptance criteria

- [ ] `zzqqxxjj` returns no results and the search box shows "No matches found".
- [ ] `kumasi` returns "Kumasi, Ashanti" first; `tamale` returns the city of Tamale first.
- [ ] `accra` returns Accra once, and no place that only shares the region name.
- [ ] A misspelling that GeoNames lists (for example `acra`) returns the place under its primary label.
- [ ] A building name and a street still appear for a query that matches them.
- [ ] Two simultaneous syncs for one building leave one row per class.
- [ ] Recording a building as demolished removes its rows without waiting for the ETL.
- [ ] The ETL script exits non-zero and does not print "Done" when the SQL fails.
- [ ] Tests cover the ranking, the threshold and the one-row-per-place rule; `npm test` and
      `npm run typecheck` pass.
- [ ] Before and after top-five results for the queries above are recorded in the receipt.

## Needs

A database role that can apply migration 064 and run the ETL. The development role in `.env.dev.local`
is read-only.
