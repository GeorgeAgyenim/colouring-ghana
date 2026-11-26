# Database setup

Initial setup, on first connection (replacing hostname, username, port, dbname as required):

```bash
$ psql "host={hostname} user={username} port={port} sslmode=require dbname=postgres"
> create database colouringlondon;
> \c colouringlondon
> create extension postgis;
> create extension pgcrypto;
> create extension pg_trgm;
> \q
```

To run all up migrations:

```bash
$ ls ./*.up.sql 2>/dev/null | while read -r migration; do psql < $migration; done;
```

Or all down migrations in reverse order:

```bash
$ ls -r ./*.down.sql 2>/dev/null | while read -r migration; do psql < $migration; done;
```

Create an app user:

```sql
-- role for server-side of front end (HTTP POST)
CREATE ROLE appusername WITH LOGIN;
-- create/update, authenticate and authorise users
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE users, user_sessions TO appusername;
-- join users against categories and access levels
GRANT SELECT ON TABLE user_access_levels, user_categories TO appusername;
-- read/write building data
GRANT SELECT, UPDATE ON TABLE buildings TO appusername;
GRANT SELECT, INSERT, DELETE ON TABLE building_user_likes TO appusername;
GRANT SELECT ON TABLE building_properties TO appusername;
-- read geometry data
GRANT SELECT ON TABLE geometries TO appusername;
-- read/append to logs
GRANT SELECT, INSERT ON TABLE logs to appusername;
-- use id sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public to appusername;
-- use postgis/pgcrypto functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO appusername;
-- read map search locations, and write name/gps rows synced on building edit
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE search_locations to appusername;
-- read GeoNames place gazetteer for town search/autofill
GRANT SELECT ON TABLE reference_tables.places TO appusername;
-- add/save user building attribute verification
GRANT SELECT, INSERT, DELETE ON TABLE building_verification TO appusername;
```

Set or update passwords:

```bash
psql -c "ALTER USER appusername WITH PASSWORD 'longsecurerandompassword';"
```

## File naming syntax

Initial up and down migrations as `###.name.up.sql` file number should be sequential
and incremental to last migrations file number is same for up/down.

If adjusting a prior migration syntax is:

    ###.name.up.sql

Syntax for adding to existing migration:

    0##.filename-extension-#.up.sql


## Derived tables

`search_locations` (the map search index) is derived data: `etl/load_search_locations.sh`
empties and rebuilds it from `reference_tables.places` and `buildings`. After a migration that
changes it (063, 064), rebuild it. After the down migration of 064, rebuild it with the code
version that matches, since 064's rebuild stores town names without their region.
Migration 064 adds a unique index on `(building_id, search_class)`; it first deletes any
duplicate name/GPS rows, keeping the newest of each.

## Migration tests

Run them against a throwaway PostGIS server; the script only creates and drops its own
`migration_test_*` databases. Its `PG*` user must be able to create databases and roles.

```bash
docker run -d --rm --name migration-tests -e POSTGRES_HOST_AUTH_METHOD=trust \
    -p 127.0.0.1:55433:5432 postgis/postgis:18-3.6
PGHOST=127.0.0.1 PGPORT=55433 PGUSER=postgres migrations/tests/run.sh       # or: run.sh 066
docker stop migration-tests
```

CI runs the same script (`.github/workflows/migrations.yml`).

## Land-use group repair and check (065, 066)

1. As the owner of `buildings`, run
   `psql -v ON_ERROR_STOP=1 -f 065.repair-cut-off-landuse-groups.up.sql` and keep its output
   with the ticket, then run `066.landuse-groups-from-reference-list.up.sql` the same way.
2. To undo, run 066's down, then 065's down, the same way.
