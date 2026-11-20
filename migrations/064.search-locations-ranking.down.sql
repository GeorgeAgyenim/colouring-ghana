-- After this, rebuild search_locations with the etl/load_search_locations.sql of the
-- matching code version: town rows written for 064 have no region in search_str.
DROP INDEX IF EXISTS search_locations_building_class_key;
ALTER TABLE search_locations DROP COLUMN IF EXISTS population;
ALTER TABLE search_locations DROP COLUMN IF EXISTS place_id;
ALTER TABLE search_locations DROP COLUMN IF EXISTS display_label;
