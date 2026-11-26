#!/usr/bin/env bash
#
# Creates a throwaway database and builds it from this repository's up migrations, applied the way
# migrations/README.md applies them: in file-name order, and an error in one statement does not stop
# the rest; it is printed here as a warning (e.g. 007 re-adds a constraint that 004 made).
# Used by migrations/tests/run.sh and by the query engine check in CI (.github/workflows/query-engine.yml;
# FR-1.6, ADR-0017, ADR-0013).
# Tickets: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md, 18-connect-colouring-ghana-to-engine.md
#
# Needs: psql on PATH, and the standard PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD) pointing
# at a server where that user may create databases and PostGIS is installed. PGDATABASE is ignored.
# The database must not exist yet; the script never drops anything.
#
# Usage:  migrations/tests/build-database.sh <database>          # every up migration
#         migrations/tests/build-database.sh <database> <NNN>    # only those numbered below NNN
#
set -euo pipefail
export LC_ALL=C   # file-name order, for the glob below, is the same on every machine

database="${1:?Usage: build-database.sh <database> [<below migration number>]}"
below="${2:-}"
migrations="$(cd "$(dirname "$0")/.." && pwd)"

# The name goes into SQL as an identifier, so only a plain lower-case name is accepted.
if ! [[ "$database" =~ ^[a-z_][a-z0-9_]{0,62}$ ]]; then
    echo "Database name must be lower-case letters, digits and underscores, starting with a letter or underscore: $database" >&2
    exit 2
fi

psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE $database"
psql -X -q -v ON_ERROR_STOP=1 -d "$database" -c "CREATE EXTENSION postgis; CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm;"

for migration_path in "$migrations"/*.up.sql; do
    migration_number="$(basename "$migration_path")"
    migration_number="${migration_number%%.*}"
    if [ -n "$below" ] && [ "$((10#$migration_number))" -ge "$((10#$below))" ]; then
        continue
    fi
    # psql exits non-zero only if it cannot run the file at all (e.g. no connection): stop then.
    if ! messages="$(psql -X -q -d "$database" -f "$migration_path" 2>&1 >/dev/null)"; then
        echo "$messages" >&2
        echo "Could not run $(basename "$migration_path")" >&2
        exit 1
    fi
    printf '%s\n' "$messages" | grep -E 'ERROR' | sed 's|^|  base migration warning: |' || true
done
