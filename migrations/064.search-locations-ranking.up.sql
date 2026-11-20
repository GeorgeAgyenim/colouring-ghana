--
-- Columns that let map search rank results and show each place once, and a unique key
-- that keeps one row per building and search class.
-- Ticket: docs/tickets/location-search/issues/01-search-relevance-and-index-integrity.md
--
-- search_locations is derived data: after applying this, rebuild it with
-- etl/load_search_locations.sh so the new columns are filled. Until then search works
-- as before (display_label falls back to search_str).
--

-- what the person sees; search_str is what is matched (for a town, the name or one
-- spelling of it without the region). NULL means show search_str.
ALTER TABLE search_locations ADD COLUMN IF NOT EXISTS display_label text;
-- GeoNames id of the place (towns only): rows sharing it are spellings of one place
ALTER TABLE search_locations ADD COLUMN IF NOT EXISTS place_id bigint;
-- GeoNames population (towns only): the bigger place wins a tie
ALTER TABLE search_locations ADD COLUMN IF NOT EXISTS population bigint;

-- Two edits to one building at the same moment could leave duplicate name/gps rows
-- before this key existed. Keep the newest row of each before adding the key.
DELETE FROM search_locations older
USING search_locations newer
WHERE older.building_id IS NOT NULL
  AND older.building_id = newer.building_id
  AND older.search_class = newer.search_class
  AND older.search_id < newer.search_id;

-- One row per building and class; app/src/api/services/building/searchSync.ts inserts
-- with ON CONFLICT on this index.
CREATE UNIQUE INDEX IF NOT EXISTS search_locations_building_class_key
    ON search_locations (building_id, search_class)
    WHERE building_id IS NOT NULL;
