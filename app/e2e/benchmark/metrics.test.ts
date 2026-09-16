/**
 * @jest-environment node
 */
import {
    classifyResource,
    findColdCacheViolations,
    median,
    percentile95,
    ResourceSample,
    summariseSegment
} from './metrics';

describe('median and percentile95', () => {
    it('return null for an empty sample', () => {
        expect(median([])).toBeNull();
        expect(percentile95([])).toBeNull();
    });

    it('median averages the two middle values of an even sample', () => {
        expect(median([5, 1, 4, 2])).toBe(3);
        expect(median([3, 1, 2])).toBe(2);
    });

    it('p95 uses the nearest rank', () => {
        expect(percentile95([10, 20, 30, 40, 50])).toBe(50);
        const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
        expect(percentile95(twenty)).toBe(19);
        expect(percentile95([7])).toBe(7);
    });
});

describe('classifyResource', () => {
    const classifier = { siteOrigin: 'http://localhost:3000', basemapHost: 'tile.openstreetmap.org' };

    it('recognises Mapnik tiles, the archive, the overlay endpoint, the basemap and the API', () => {
        expect(classifyResource('http://localhost:3000/tiles/date_year/16/32490/32470.png?rev=1', classifier)).toBe('buildings-tiles');
        expect(classifyResource('http://localhost:3000/colouringghana/tiles/highlight/16/1/2.png', classifier)).toBe('buildings-tiles');
        expect(classifyResource('http://localhost:3000/archive/buildings-2026-09-16.pmtiles', classifier)).toBe('buildings-tiles');
        expect(classifyResource('http://localhost:3000/api/buildings/edited-since?after=2026-09-16T00:00:00Z', classifier)).toBe('buildings-tiles');
        expect(classifyResource('https://tile.openstreetmap.org/16/32490/32470.png', classifier)).toBe('basemap');
        expect(classifyResource('http://localhost:3000/api/buildings/locate?lat=1&lng=2', classifier)).toBe('api');
        expect(classifyResource('http://localhost:3000/static/js/client.js', classifier)).toBe('other');
        expect(classifyResource('https://fonts.example/font.woff2', classifier)).toBe('other');
        expect(classifyResource('not a url', classifier)).toBe('other');
    });
});

describe('summariseSegment', () => {
    const tile = (latencyMs: number, bytes: number, reused = false): ResourceSample => ({
        url: `http://localhost:3000/tiles/date_year/16/${latencyMs}/1.png`,
        kind: 'buildings-tiles',
        latencyMs,
        bytes,
        bytesSource: 'performance',
        reused
    });

    it('sums bytes per kind and excludes cache reuse from latency', () => {
        const summary = summariseSegment([
            tile(100, 1000),
            tile(300, 3000),
            tile(0, 0, true),
            { url: 'https://tile.openstreetmap.org/16/1/1.png', kind: 'basemap', latencyMs: 50, bytes: 500, bytesSource: 'cdp', reused: false },
            { url: 'http://localhost:3000/api/buildings/locate', kind: 'api', latencyMs: 80, bytes: 200, bytesSource: 'performance', reused: false },
            { url: 'https://other.example/x.js', kind: 'other', latencyMs: 10, bytes: 0, bytesSource: 'none', reused: false }
        ]);
        expect(summary.tiles).toEqual({ count: 2, reused: 1, latencyMedianMs: 200, latencyP95Ms: 300 });
        expect(summary.bytes).toEqual({ buildingsTiles: 4000, basemap: 500, api: 200, other: 0, total: 4700, unmeasuredCount: 1 });
    });

    it('handles a segment with no tiles', () => {
        const summary = summariseSegment([]);
        expect(summary.tiles.count).toBe(0);
        expect(summary.tiles.latencyP95Ms).toBeNull();
        expect(summary.bytes.total).toBe(0);
    });
});

describe('findColdCacheViolations', () => {
    it('passes when every cached response repeats a URL fetched earlier in the repetition', () => {
        expect(findColdCacheViolations([
            { url: 'http://s/a', fromCache: false },
            { url: 'http://s/b', fromCache: false },
            { url: 'http://s/a', fromCache: true }
        ])).toEqual([]);
    });

    it('fails on a cached response for a URL never fetched over the network', () => {
        expect(findColdCacheViolations([
            { url: 'http://s/a', fromCache: true },
            { url: 'http://s/b', fromCache: false },
            { url: 'http://s/b', fromCache: true },
            { url: 'http://s/c', fromCache: true }
        ])).toEqual(['http://s/a', 'http://s/c']);
    });

    it('ignores inline data and blob URLs, which are never network responses', () => {
        expect(findColdCacheViolations([
            { url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', fromCache: true },
            { url: 'blob:http://localhost:3000/abc', fromCache: true }
        ])).toEqual([]);
    });
});
