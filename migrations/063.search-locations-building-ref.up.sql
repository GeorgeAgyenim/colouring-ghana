--
-- Link building-derived search rows (name / gps) back to their building so they
-- can be kept in sync in real time when a building is edited
-- (see app/src/api/services/building/searchSync.ts).
--
-- NULL for town rows (from GeoNames) and street rows (aggregates over many
-- buildings); set for name/gps rows (one row per building).
--
ALTER TABLE search_locations ADD COLUMN IF NOT EXISTS building_id integer REFERENCES buildings;
CREATE INDEX IF NOT EXISTS search_locations_building_id_idx ON search_locations ( building_id );

-- The app role writes name/gps rows on edit. Grant accordingly (role name is
-- deployment-specific; see migrations/README.md). Example:
--   GRANT INSERT, UPDATE, DELETE ON search_locations TO appusername;
