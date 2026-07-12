DROP INDEX IF EXISTS search_locations_building_id_idx;
ALTER TABLE search_locations DROP COLUMN IF EXISTS building_id;
