#!/usr/bin/env bash

#
# Rebuild the map search index (search_locations) from building location data.
# Re-run after bulk edits or on a schedule so new towns/streets/names/GPS
# addresses become searchable.
#

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Rebuilding search_locations from building data..."
psql -f "${script_dir}/load_search_locations.sql"

echo "Done. Row counts by class:"
psql -c "SELECT search_class, count(*) FROM search_locations GROUP BY search_class ORDER BY search_class;"
