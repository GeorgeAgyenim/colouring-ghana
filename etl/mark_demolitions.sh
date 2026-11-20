#!/usr/bin/env bash

psql -c "DROP TABLE IF EXISTS old_geometries;"

echo "Creating temporary table for geometries in the db not present in new data..."
psql -c "CREATE TABLE IF NOT EXISTS old_geometries (
    source_id varchar(30) PRIMARY KEY,
    geometry_geom geometry(GEOMETRY, 3857)
);"

echo "Find geometries in the db not present in new data..."
psql -c "INSERT INTO old_geometries ( source_id, geometry_geom )
         SELECT source_id, geometry_geom
         FROM geometries AS g
         WHERE NOT EXISTS ( SELECT source_id
                            FROM release_geometries AS r
                            WHERE g.source_id = r.source_id);"
                            
echo "Set each building's latest_demolish_date for today if linked geometry in the db not present in new data,"
echo "and remove those buildings' name and GPS rows from map search..."
# One -c string runs as one transaction: a building is never marked demolished while still
# searchable by name or GPS address. Street rows are aggregates over many buildings and are
# refreshed by etl/load_search_locations.sh.
psql -v ON_ERROR_STOP=1 -c "UPDATE buildings
         SET latest_demolish_date = CURRENT_DATE
         FROM old_geometries AS og
         WHERE buildings.ref_toid = og.source_id;
         DELETE FROM search_locations AS sl
         USING buildings AS b, old_geometries AS og
         WHERE sl.building_id = b.building_id
           AND b.ref_toid = og.source_id;"