-- Add GhanaPost GPS digital address field for search
-- Codes are formatted AA-NNN-NNNN (e.g. GA-183-9385), max ~11 chars
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS location_gps_address varchar;
ALTER TABLE buildings ADD CONSTRAINT buildings_location_gps_address_len CHECK (length(location_gps_address) < 15);
