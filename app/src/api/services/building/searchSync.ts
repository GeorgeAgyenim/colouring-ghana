import db from '../../../db';
import { logErrorSafely } from '../../logError';

/**
 * Keep a building's search index rows (name / GhanaPost GPS) in sync with its
 * current attributes, so a newly recorded name or GPS address is searchable
 * immediately without waiting for the periodic ETL rebuild.
 *
 * Only the per-building 'name' and 'gps' rows are managed here (matched by
 * building_id). Town rows come from the GeoNames gazetteer and street rows are
 * aggregates over many buildings - both are handled by the ETL, not here.
 *
 * Syncs of one building run one at a time: each locks the building's row first, as
 * edits do. Without that, a sync could delete before an earlier sync's insert was
 * committed and leave a name the building no longer has. Each statement then reads the
 * building as last committed, so the last sync writes the latest values. The unique
 * index search_locations_building_class_key (migration 064) keeps one row per building
 * and class whatever happens; the insert updates the row if one is already there.
 *
 * Called post-commit from editBuilding; failures are logged, not thrown, so a
 * search-sync problem can never roll back or fail the user's edit. The ETL
 * (etl/load_search_locations.sql) remains the backstop for full rebuilds.
 */
export async function syncBuildingSearchLocations(buildingId: number): Promise<void> {
    try {
        await db.tx(async t => {
            // one sync per building at a time (see above)
            await t.oneOrNone(
                `SELECT 1 FROM buildings WHERE building_id = $1 FOR UPDATE`,
                [buildingId]
            );
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
                  AND btrim(coalesce(v.val, '')) <> ''
                ON CONFLICT (building_id, search_class) WHERE building_id IS NOT NULL
                DO UPDATE SET
                    search_str = EXCLUDED.search_str,
                    center = EXCLUDED.center,
                    zoom = EXCLUDED.zoom`,
                [buildingId]
            );
        });
    } catch (error) {
        logErrorSafely(`Failed to sync search_locations for building ${buildingId}:`, error);
    }
}
