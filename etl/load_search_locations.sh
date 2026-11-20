#!/usr/bin/env bash

#
# Rebuild the map search index (search_locations) from building location data.
# Re-run after bulk edits or on a schedule so new towns/streets/names/GPS
# addresses become searchable.
#
# Stops at the first SQL error and exits non-zero; load_search_locations.sql runs in
# one transaction, so a failed rebuild leaves the previous index in place.
#

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Rebuilding search_locations from building data..."
psql -v ON_ERROR_STOP=1 -f "${script_dir}/load_search_locations.sql"

echo "Done. Row counts by class:"
psql -v ON_ERROR_STOP=1 -c "SELECT search_class, count(*) FROM search_locations GROUP BY search_class ORDER BY search_class;"
