#!/usr/bin/env bash

#
# Load GeoNames populated-places for Ghana into reference_tables.places.
#
# Source: GeoNames geographical database (https://www.geonames.org), CC BY 4.0.
#         Attribute GeoNames when reusing this data.
#
# Downloads (canonical, stable format):
#   - GH.zip              -> GH.txt (all Ghana records, 19 tab-delimited columns)
#   - admin1CodesASCII.txt (maps admin1 codes e.g. "GH.02" -> region name)
#
# Prerequisite: migration 062.geonames-places.up.sql applied.
# Run with the same PG* environment / psql connection used for other ETL scripts.
#
# GH.txt columns (tab-delimited, no header), per the GeoNames export README:
#   geonameid, name, asciiname, alternatenames, latitude, longitude,
#   feature_class, feature_code, country_code, cc2, admin1_code, admin2_code,
#   admin3_code, admin4_code, population, elevation, dem, timezone, modification_date
#

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work_dir="${script_dir}/geonames_gh"
mkdir -p "${work_dir}"
cd "${work_dir}"

# ── Download ────────────────────────────────────────────────────────────────
if [ ! -f GH.txt ]; then
    echo "Downloading GH.zip from GeoNames..."
    curl -fsSL -o GH.zip "https://download.geonames.org/export/dump/GH.zip"
    unzip -o GH.zip GH.txt
fi

if [ ! -f admin1CodesASCII.txt ]; then
    echo "Downloading admin1CodesASCII.txt from GeoNames..."
    curl -fsSL -o admin1CodesASCII.txt "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
fi

# ── Load into staging + populate reference_tables.places ────────────────────
echo "Loading GeoNames data into reference_tables.places..."
psql -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

-- Raw staging tables (all text; GeoNames uses empty strings for missing values)
CREATE TEMP TABLE geonames_gh_raw (
    geonameid bigint,
    name text, asciiname text, alternatenames text,
    latitude double precision, longitude double precision,
    feature_class text, feature_code text,
    country_code text, cc2 text,
    admin1_code text, admin2_code text, admin3_code text, admin4_code text,
    population bigint, elevation integer, dem integer,
    timezone text, modification_date date
) ON COMMIT DROP;

CREATE TEMP TABLE geonames_admin1_raw (
    code text, name text, asciiname text, geonameid bigint
) ON COMMIT DROP;

\copy geonames_gh_raw FROM 'GH.txt' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '')
\copy geonames_admin1_raw FROM 'admin1CodesASCII.txt' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '')

TRUNCATE reference_tables.places;

INSERT INTO reference_tables.places
    (geonameid, name, asciiname, alternatenames, latitude, longitude,
     feature_code, admin1_code, admin1_name, population, elevation)
SELECT
    g.geonameid, g.name, g.asciiname, g.alternatenames, g.latitude, g.longitude,
    g.feature_code, g.admin1_code, a.name, g.population, g.elevation
FROM geonames_gh_raw g
LEFT JOIN geonames_admin1_raw a
    ON a.code = g.country_code || '.' || g.admin1_code
WHERE g.feature_class = 'P';

COMMIT;
SQL

echo "Done. Populated places loaded:"
psql -c "SELECT count(*) AS populated_places FROM reference_tables.places;"
