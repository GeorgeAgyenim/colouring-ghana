--
-- GeoNames populated-places gazetteer for Ghana, used as the authoritative
-- source for town/place search and for the town autofill dropdown.
--
-- Source: GeoNames geographical database (https://www.geonames.org), CC BY 4.0.
-- Only 'populated place' records (feature_class = 'P') are stored here; the
-- loader (etl/load_geonames_places.sh) filters and populates this table.
--
-- uses extension: CREATE EXTENSION pg_trgm;  (already required by 008.search)
--

-- reference_tables schema already created in 015.bulk_data_sources
CREATE TABLE IF NOT EXISTS reference_tables.places (
    -- stable GeoNames identifier
    geonameid bigint PRIMARY KEY,
    -- primary place name
    name varchar(200) NOT NULL,
    -- ascii transliteration of the name
    asciiname varchar(200),
    -- comma-separated variant/alternate spellings (for spelling-tolerant search)
    alternatenames text,
    -- WGS84 coordinates
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    -- GeoNames feature code (e.g. PPL, PPLA) - settlement type
    feature_code varchar(10),
    -- first-order admin division (region) code and resolved name
    admin1_code varchar(20),
    admin1_name varchar(200),
    -- estimated population (used to derive a sensible search zoom level)
    population bigint,
    elevation integer
);

-- Trigram indexes for fuzzy / partial-match search on names
CREATE INDEX IF NOT EXISTS trgm_gist_idx_places_name
    ON reference_tables.places USING GIST (name gist_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_gist_idx_places_asciiname
    ON reference_tables.places USING GIST (asciiname gist_trgm_ops);
