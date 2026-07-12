ALTER TABLE buildings DROP CONSTRAINT IF EXISTS buildings_location_gps_address_len;
ALTER TABLE buildings DROP COLUMN IF EXISTS location_gps_address;
