import db from '../../../db';

/**
 * Keep a building's search index rows (name / GhanaPost GPS) in sync with its
 * current attributes, so a newly recorded name or GPS address is searchable
 * immediately without waiting for the periodic ETL rebuild.
 *
 * Only the per-building 'name' and 'gps' rows are managed here (matched by
 * building_id). Town rows come from the GeoNames gazetteer and street rows are
 * aggregates over many buildings - both are handled by the ETL, not here.
 *
 * Called post-commit from editBuilding; failures are logged, not thrown, so a
 * search-sync problem can never roll back or fail the user's edit. The ETL
 * (etl/load_search_locations.sql) remains the backstop for full rebuilds.
 */
export async function syncBuildingSearchLocations(buildingId: number): Promise<void> {
    try {
        await db.tx(async t => {
            await t.none(
                `DELETE FROM search_locations WHERE building_id = $1`,
                [buildingId]
            );
            await t.none(
                `INSERT INTO search_locations (search_str, search_class, center, zoom, building_id)
                SELECT
                    v.val,
                    v.cls,
                    ST_Transform(ST_Centroid(g.geometry_geom), 4326),
                    18,
                    b.building_id
                FROM buildings b
                JOIN geometries g ON b.geometry_id = g.geometry_id
                CROSS JOIN LATERAL (
                    VALUES
                        (b.location_name, 'name'),
                        (b.location_gps_address, 'gps')
                ) AS v(val, cls)
                WHERE b.building_id = $1
                  AND b.latest_demolish_date IS NULL
                  AND btrim(coalesce(v.val, '')) <> ''`,
                [buildingId]
            );
        });
    } catch (error) {
        console.error(`Failed to sync search_locations for building ${buildingId}:`, error);
    }
}
