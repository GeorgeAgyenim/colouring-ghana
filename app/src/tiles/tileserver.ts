/**
 * Tileserver
 * - routes for Express app
 * - see rendererDefinition for actual rules of rendering
 */
import express from 'express';
import path from 'path';
import fs from 'fs';

import asyncController from '../api/routes/asyncController';
import { strictParseInt } from '../parse';

import { allTilesets, renderBuildingVectorTile } from './rendererDefinition';
import { TileParams } from './types';

// ─── Geometry version ────────────────────────────────────────────────────────
// Persisted to disk so it survives server restarts. Stored alongside the tile
// cache directory (TILECACHE_PATH), which is the established location for
// persistent tile-related state.

const GV_FILE = path.join(process.env.TILECACHE_PATH || '.', '.geometry-version');
let geometryVersion = 1;
try {
    geometryVersion = parseInt(fs.readFileSync(GV_FILE, 'utf8').trim(), 10) || 1;
} catch { /* file doesn't exist yet, default to 1 */ }

// ─── Cache configuration ─────────────────────────────────────────────────────

const GEOMETRY_ONLY_TILESETS = new Set(['base_light', 'base_night', 'base_night_outlines']);

// immutable + 1-year max-age is safe for ALL tilesets:
// - Geometry-only tiles use ?gv= which only changes on geometry imports
//   (via the admin cache-clear endpoint). Between imports, browsers cache
//   these tiles indefinitely at a stable URL.
// - Data tiles use ?rev= which changes on every attribute edit. The browser
//   never serves stale data because the old URL is never requested again.
const CACHE_HEADER = 'public, max-age=31536000, immutable';

const vectorTileCache = new Map<string, { buf: Buffer, ts: number }>();
const DATA_CACHE_TTL_MS = 5 * 60_000;
const GEOM_CACHE_TTL_MS = Infinity;

// ─── Tile request handler ────────────────────────────────────────────────────

const handleVectorTileRequest = asyncController(async function (req: express.Request, res: express.Response) {
    try {
        var tileParams = parseTileParams(req.params);
    } catch (err) {
        console.error(err);
        return res.status(400).send({ error: err.message });
    }

    const cacheKey = `${tileParams.tileset}/${tileParams.z}/${tileParams.x}/${tileParams.y}`;
    const ttl = GEOMETRY_ONLY_TILESETS.has(tileParams.tileset) ? GEOM_CACHE_TTL_MS : DATA_CACHE_TTL_MS;
    const cached = vectorTileCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) {
        res.writeHead(200, {
            'Content-Type': 'application/x-protobuf',
            'Cache-Control': CACHE_HEADER,
        });
        return res.end(cached.buf);
    }

    try {
        const pbf = await renderBuildingVectorTile(tileParams);
        vectorTileCache.set(cacheKey, { buf: pbf, ts: Date.now() });
        res.writeHead(200, {
            'Content-Type': 'application/x-protobuf',
            'Cache-Control': CACHE_HEADER,
        });
        res.end(pbf);
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
});

// ─── Router ──────────────────────────────────────────────────────────────────

const router = express.Router();

router.get('/geometry-version', (_req, res) => {
    res.json({ gv: geometryVersion });
});

router.post('/cache/clear-geometry', (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).send({ error: 'Forbidden' });
    }

    geometryVersion++;
    try {
        fs.writeFileSync(GV_FILE, String(geometryVersion), 'utf8');
    } catch (err) {
        console.error('Failed to persist geometry version:', err);
    }

    let cleared = 0;
    for (const key of vectorTileCache.keys()) {
        if (GEOMETRY_ONLY_TILESETS.has(key.split('/')[0])) {
            vectorTileCache.delete(key);
            cleared++;
        }
    }

    res.json({ gv: geometryVersion, cleared });
});

router.get('/:tileset/:z/:x/:y(\\d+).pbf', handleVectorTileRequest);

function parseTileParams(params: any): TileParams {
    const { tileset, z, x, y, scale } = params;

    if (!allTilesets.includes(tileset)) throw new Error('Invalid value for tileset: ' + tileset);
    
    const intZ = strictParseInt(z);
    if (isNaN(intZ)) throw new Error('Invalid value for z: ' + intZ);

    const intX = strictParseInt(x);
    if (isNaN(intX)) throw new Error('Invalid value for x: ' + intX);

    const intY = strictParseInt(y);
    if (isNaN(intY)) throw new Error('Invalid value for y: ' + intY);

    let intScale: number;
    if (scale === '@2x') {
        intScale = 2;
    } else if (scale === '@1x' || scale == undefined) {
        intScale = 1;
    } else {
        throw new Error('Invalid value for scale');
    }

    return {
        tileset,
        z: intZ,
        x: intX,
        y: intY,
        scale: intScale
    };
}

router.use((req, res) => {
    return res.status(404).send('Tile not found');
});

export default router;
