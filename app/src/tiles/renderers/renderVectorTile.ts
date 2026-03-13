/**
 * renderVectorTile
 *
 * Generates a Mapbox Vector Tile (.pbf) directly from PostGIS using ST_AsMVT.
 * This replaces the Mapnik-based renderDataSourceTile for all building data layers.
 *
 * Why ST_AsMVT is faster:
 *  - No Mapnik object creation, XML style loading, or PNG encoding per request
 *  - PostGIS generates the tile binary natively in a single SQL query
 *  - Colour rendering moves to the client (browser), eliminating server-side image work
 *  - Tiles are smaller in transit (.pbf vs .png), improving browser load times
 */

import db from '../../db';
import { TileParams, Tile } from '../types';

/**
 * MVT tile extent in pixels. 4096 is the de-facto standard for high-fidelity tiles.
 */
const MVT_EXTENT = 4096;

/**
 * Tile buffer in pixels. Matches the buffer used in the previous Mapnik renderer
 * to prevent clipping of features at tile boundaries.
 */
const MVT_BUFFER = 64;

/**
 * Returns the SQL fragment that wraps a per-layer query into a full ST_AsMVT call.
 *
 * The inner query is expected to:
 *  - Select `geometry_id` plus any data columns needed for styling
 *  - Already be joined to `geometries` and filtered appropriately
 *
 * We use ST_TileEnvelope (PostGIS 3.0+) to derive the tile bounding box,
 * and ST_Transform to convert geometries from WGS84 (EPSG:4326, as stored)
 * to Web Mercator (EPSG:3857, as required by the MVT spec).
 */
function buildMvtQuery(innerSql: string, tileset: string): string {
    return `
        SELECT ST_AsMVT(tile, $4, ${MVT_EXTENT}, 'geom') AS mvt
        FROM (
            SELECT
                ST_AsMVTGeom(
                    ST_Simplify(g.geometry_geom, CASE WHEN $1::int < 15 THEN 2.0 ELSE 0 END),
                    ST_TileEnvelope($1, $2, $3),
                    ${MVT_EXTENT},
                    ${MVT_BUFFER},
                    true
                ) AS geom,
                d.*
            FROM (
                ${innerSql}
            ) AS d
            JOIN geometries AS g ON d.geometry_id = g.geometry_id
            WHERE g.geometry_geom && ST_TileEnvelope($1, $2, $3)
        ) AS tile
        WHERE geom IS NOT NULL
    `;
}

/**
 * Render a single vector tile (.pbf) for the given tile coordinates and tileset.
 *
 * @param tileParams   - Tile coordinates (z, x, y) and tileset name
 * @param innerSql     - The per-layer SQL query (from dataDefinition.getVectorLayerQuery)
 * @returns            - A Buffer containing the raw .pbf binary, or an empty Buffer
 *                       if the tile contains no features
 */
async function renderVectorTile(
    { tileset, z, x, y }: TileParams,
    innerSql: string
): Promise<Tile> {
    const query = buildMvtQuery(innerSql, tileset);

    const result = await db.one<{ mvt: Buffer | null }>(
        query,
        [z, x, y, tileset]
    );

    // ST_AsMVT returns NULL when there are no features in the tile.
    // Return an empty Buffer rather than null so the caller always receives a Buffer.
    return result.mvt ?? Buffer.alloc(0);
}

export { renderVectorTile };