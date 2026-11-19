/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/21-tile-cache-skip-logged-as-failure.md
 *
 * A tile the cache is set not to keep (here, deeper than zoom 18) is served without being
 * cached and without an error in the server log. A tile the cache should keep but cannot
 * write is still logged as a failure.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getTileWithCaching } from '../renderers/getTileWithCaching';
import { TileCache } from '../tileCache';
import { TileParams } from '../types';

const TILE = Buffer.from('rendered tile');

function makeCache(basePath: string) {
    return new TileCache(
        basePath,
        { tilesets: ['date_year'], minZoom: 9, maxZoom: 19, scales: [1, 2] },
        ({ z }: TileParams) => z <= 18
    );
}

describe('caching a rendered tile', () => {
    let basePath: string;
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
        basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'tilecache-test-'));
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
        fs.rmdirSync(basePath, { recursive: true });
    });

    it('serves a tile the cache does not keep without caching it or logging an error', async () => {
        const tile = await getTileWithCaching(
            { tileset: 'date_year', z: 19, x: 1, y: 2, scale: 1 }, {}, makeCache(basePath), async () => TILE
        );

        expect(tile).toBe(TILE);
        expect(fs.readdirSync(basePath)).toEqual([]);
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('caches a tile the cache keeps', async () => {
        await getTileWithCaching(
            { tileset: 'date_year', z: 18, x: 1, y: 2, scale: 1 }, {}, makeCache(basePath), async () => TILE
        );

        expect(fs.readFileSync(path.join(basePath, 'date_year/18/1/2.png'))).toEqual(TILE);
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('logs a tile the cache keeps but cannot write', async () => {
        const fileInTheWay = path.join(basePath, 'not-a-directory');
        fs.writeFileSync(fileInTheWay, '');

        const tile = await getTileWithCaching(
            { tileset: 'date_year', z: 18, x: 1, y: 2, scale: 1 }, {}, makeCache(fileInTheWay), async () => TILE
        );

        expect(tile).toBe(TILE);
        expect(consoleError).toHaveBeenCalledWith('Failed to cache tile:', expect.any(String));
    });
});
