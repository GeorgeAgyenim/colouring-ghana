#!/usr/bin/env bash
#
# Runs the SQL migration tests in this folder against a throwaway PostgreSQL server.
# Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
#
# Each test file is named NNN.<what it tests>.test.sql. For each one the script creates a fresh
# database, builds it from every up migration numbered below NNN (applied the way
# migrations/README.md applies them: in file-name order, an error in one statement does not stop
# the rest, and is printed here as a warning), then runs the test file with ON_ERROR_STOP. A test
# asserts by raising an exception, so any failed assertion or SQL error fails the run.
#
# Needs: psql on PATH, and the standard PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD) pointing
# at a server where that user may create databases and roles and PostGIS is installed. PGDATABASE is
# ignored.
#
# Safety: the script only ever creates, uses and drops databases named migration_test_<number>_<pid>.
# It connects to the server's "postgres" database to create and drop them and never reads or writes
# any other database, so it cannot change live data. A test that needs a database role creates it
# inside a transaction it rolls back, so no role is left on the server.
#
# Usage:  migrations/tests/run.sh               # every test
#         migrations/tests/run.sh 066           # only tests whose file name starts with 066
#
set -euo pipefail
export LC_ALL=C   # file-name order, for globs below, is the same on every machine

here="$(cd "$(dirname "$0")" && pwd)"
migrations="$(cd "$here/.." && pwd)"
filter="${1:-}"

run_psql() {
    psql -X -q -v ON_ERROR_STOP=1 "$@"
}

current_db=""
drop_current_db() {
    if [ -n "$current_db" ]; then
        run_psql -d postgres -c "SET client_min_messages = warning" -c "DROP DATABASE IF EXISTS $current_db"
        current_db=""
    fi
}
trap drop_current_db EXIT

failures=0
tests_run=0

for test_path in "$here"/*.test.sql; do
    [ -e "$test_path" ] || continue
    name="$(basename "$test_path")"
    number="${name%%.*}"
    if ! [[ "$number" =~ ^[0-9]{3}$ ]]; then
        echo "Test file $name must start with a three-digit migration number" >&2
        exit 1
    fi
    if [ -n "$filter" ] && [[ "$name" != "$filter"* ]]; then
        continue
    fi

    current_db="migration_test_${number}_$$"
    run_psql -d postgres -c "SET client_min_messages = warning" \
        -c "DROP DATABASE IF EXISTS $current_db" -c "CREATE DATABASE $current_db"
    run_psql -d "$current_db" -c "CREATE EXTENSION postgis; CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm;"

    # Base schema: every up migration numbered below the test's number, as README.md applies them.
    for migration_path in "$migrations"/*.up.sql; do
        migration_number="$(basename "$migration_path")"
        migration_number="${migration_number%%.*}"
        if [ "$((10#$migration_number))" -ge "$((10#$number))" ]; then
            continue
        fi
        # psql exits non-zero only if it cannot run the file at all (e.g. no connection): stop then.
        # A failed statement inside it is reported and the rest of the file still runs, as in
        # README.md (e.g. 007 re-adds a constraint that 004 made).
        if ! messages="$(psql -X -q -d "$current_db" -f "$migration_path" 2>&1 >/dev/null)"; then
            echo "$messages" >&2
            echo "Could not run $(basename "$migration_path")" >&2
            exit 1
        fi
        printf '%s\n' "$messages" | grep -E 'ERROR' | sed 's|^|  base migration warning: |' || true
    done

    echo "Running $name"
    tests_run=$((tests_run + 1))
    if (cd "$here" && run_psql -d "$current_db" -f "$name"); then
        echo "PASS $name"
    else
        echo "FAIL $name"
        failures=$((failures + 1))
    fi

    drop_current_db
done

if [ "$tests_run" -eq 0 ]; then
    echo "No migration tests matched '${filter}'" >&2
    exit 1
fi
echo "$tests_run migration test file(s), $failures failed"
[ "$failures" -eq 0 ]
