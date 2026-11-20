--
-- Rebuild the map search index (search_locations).
--
-- Two sources feed search:
--   * TOWNS / PLACES  -> from the GeoNames gazetteer (reference_tables.places).
--     Authoritative and independent of contributions, so a place is searchable
--     even if no one has edited a building there. Includes alternate spellings.
--   * NAME / GPS / STREET -> derived from building contributions (nothing external
--     knows these). name/gps rows are also kept fresh in real time on edit
--     (see app/src/api/services/building/searchSync.ts); this script is the full
--     rebuild / backfill path (e.g. after bulk imports).
--
-- The frontend search (/api/search) consumes center (POINT, 4326) + zoom, and shows
-- display_label (or search_str when it is NULL). Ranking: docs/location-search.md.
--
-- Prerequisites: migrations 062 (reference_tables.places), 063 (building_id
-- column on search_locations) and 064 (display_label, place_id, population)
-- applied; reference_tables.places populated via etl/load_geonames_places.sh.
--
-- Run with: psql <connection> -f etl/load_search_locations.sql
--

BEGIN;

TRUNCATE search_locations RESTART IDENTITY;

-- ── TOWNS / PLACES (from GeoNames) ──────────────────────────────────────────
-- One row for the primary name and one per alternate spelling, all carrying the same
-- place_id so search shows the place once. search_str is only the name or spelling
-- (matching the region too made every "..., Greater Accra" place match "accra");
-- display_label is the primary name and region, which tells homonyms apart
-- ("Nyamebekyere, Ashanti") and is what the person sees whichever spelling matched.
-- population breaks ties between equally good matches; zoom frames the place.
INSERT INTO search_locations (search_str, display_label, search_class, center, zoom, place_id, population)
SELECT
    town_labels.search_str,
    p.name || coalesce(', ' || p.admin1_name, ''),
    'town',
    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326),
    CASE
        WHEN p.population > 250000 THEN 12
        WHEN p.population > 50000  THEN 13
        WHEN p.population > 10000  THEN 14
        WHEN p.population > 0      THEN 15
        ELSE 14
    END,
    p.geonameid,
    p.population
FROM (
    -- primary names
    SELECT p.geonameid, p.name AS search_str
    FROM reference_tables.places p
    UNION ALL
    -- alternate / variant spellings
    SELECT p.geonameid, btrim(alt) AS search_str
    FROM reference_tables.places p,
         LATERAL regexp_split_to_table(coalesce(p.alternatenames, ''), ',') AS alt
    WHERE btrim(alt) <> ''
      AND length(btrim(alt)) BETWEEN 2 AND 60
      AND lower(btrim(alt)) <> lower(p.name)
) town_labels
JOIN reference_tables.places p ON p.geonameid = town_labels.geonameid;

-- ── NAMED BUILDINGS (from contributions) ────────────────────────────────────
INSERT INTO search_locations (search_str, search_class, center, zoom, building_id)
SELECT
    b.location_name,
    'name',
    ST_Transform(ST_Centroid(g.geometry_geom), 4326),
    18,
    b.building_id
FROM buildings b
JOIN geometries g ON b.geometry_id = g.geometry_id
WHERE b.latest_demolish_date IS NULL
  AND btrim(coalesce(b.location_name, '')) <> '';

-- ── GHANAPOST GPS ADDRESSES (from contributions) ────────────────────────────
INSERT INTO search_locations (search_str, search_class, center, zoom, building_id)
SELECT
    b.location_gps_address,
    'gps',
    ST_Transform(ST_Centroid(g.geometry_geom), 4326),
    18,
    b.building_id
FROM buildings b
JOIN geometries g ON b.geometry_id = g.geometry_id
WHERE b.latest_demolish_date IS NULL
  AND btrim(coalesce(b.location_gps_address, '')) <> '';

-- ── STREETS (from contributions, aggregated per town) ───────────────────────
-- Matched on the street name only; the town (which may carry its region) is shown,
-- not matched, for the same reason as towns above.
INSERT INTO search_locations (search_str, display_label, search_class, center, zoom)
SELECT
    street,
    street || ', ' || town,
    'street',
    ST_Transform(ST_Centroid(geom), 4326),
    16
FROM (
    SELECT
        b.location_street AS street,
        b.location_town AS town,
        ST_Collect(g.geometry_geom) AS geom
    FROM buildings b
    JOIN geometries g ON b.geometry_id = g.geometry_id
    WHERE b.latest_demolish_date IS NULL
      AND btrim(coalesce(b.location_street, '')) <> ''
      AND btrim(coalesce(b.location_town, '')) <> ''
    GROUP BY b.location_street, b.location_town
) street_agg;

COMMIT;
