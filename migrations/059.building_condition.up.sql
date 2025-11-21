-- Add building condition field for Ghana
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_condition text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_condition_source_type text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_condition_source_links text[];

