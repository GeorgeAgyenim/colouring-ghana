/**
 * @jest-environment node
 */
import { renderReport } from './report';
import { RepetitionResult, RunResult, summariseRun } from './results';

function segment(id: string, name: string, durationMs: number, tileBytes: number, latencies: number[], reused = 0) {
    return {
        id,
        name,
        durationMs,
        tileLatenciesMs: latencies,
        summary: {
            tiles: { count: latencies.length, reused, latencyMedianMs: latencies[0] ?? null, latencyP95Ms: latencies[latencies.length - 1] ?? null },
            bytes: { buildingsTiles: tileBytes, basemap: 100, api: 0, other: 0, total: tileBytes + 100, unmeasuredCount: 0 }
        }
    };
}

function repetition(index: number, tti: number, scale: number): RepetitionResult {
    return {
        index,
        startedAt: '2026-09-16T10:00:00.000Z',
        timeToInteractiveMs: tti,
        navigation: { domContentLoadedMs: 500, loadEventEndMs: 900 },
        segments: [
            segment('initial-load', 'Initial load', tti, 1000 * scale, [100 * scale, 200 * scale]),
            segment('zoom-12-13', 'Zoom 12 to 13', 400, 500 * scale, [150 * scale], 2)
        ],
        coldCacheViolations: []
    };
}

function run(id: 'A' | 'B' | 'C', ttis: number[], scale = 1): RunResult {
    return {
        formatVersion: 1,
        methodVersion: 1,
        label: 'before',
        run: id,
        runDescription: 'laptop, unthrottled',
        stack: 'leaflet',
        date: '2026-09-16',
        recordedAt: '2026-09-16T10:00:00.000Z',
        device: 'Unknown — to be confirmed by the product owner',
        connection: 'office',
        browser: { name: 'chromium', version: '153.0', headless: true },
        viewport: { width: 1280, height: 800 },
        baseUrl: 'http://localhost:3000',
        cdnOrProxy: 'none',
        throttle: null,
        scriptCommit: 'abc1234',
        pathFile: { path: 'app/e2e/map-path.json', sha256: 'deadbeef' },
        repetitions: ttis.map((tti, i) => repetition(i + 1, tti, scale))
    };
}

describe('summariseRun', () => {
    it('computes median and p95 across repetitions and pools tile latencies across the path', () => {
        const s = summariseRun(run('A', [1000, 1200, 1100, 1300, 1400]));
        expect(s.timeToInteractiveMs).toEqual({ median: 1200, p95: 1400, n: 5 });
        expect(s.tileLatencyP95Ms.median).toBe(200);
        expect(s.bytesBuildingsTiles.median).toBe(1500);
        expect(s.bytesBasemap.median).toBe(200);
        expect(s.coldCacheOk).toBe(true);
        expect(s.segments.map(seg => seg.id)).toEqual(['initial-load', 'zoom-12-13']);
        expect(s.segments[1].tilesReused.median).toBe(2);
    });

    it('reports a failed cold-cache assertion', () => {
        const r = run('A', [1000]);
        r.repetitions[0].coldCacheViolations = ['http://localhost:3000/tiles/x.png'];
        expect(summariseRun(r).coldCacheOk).toBe(false);
    });
});

describe('renderReport', () => {
    it('writes one section per recorded run, bytes beside every timing, and targets from run B', () => {
        const text = renderReport([run('B', [2000, 2200, 2100, 2300, 2400], 2), run('A', [1000, 1200, 1100, 1300, 1400])], { label: 'before', date: '2026-09-16' });
        expect(text).toContain('# Map benchmark — before (Leaflet + Mapnik raster tiles) — 2026-09-16');
        expect(text).toContain('version 1');
        expect(text.indexOf('## Run A')).toBeLessThan(text.indexOf('## Run B'));
        expect(text).toContain('- Run C: not recorded');
        expect(text).toContain('Hardware: Unknown — to be confirmed by the product owner');
        expect(text).toContain('| Time-to-interactive (navigation start to first map settle) | 1200 ms | 1400 ms | initial load: 1,100 B |');
        expect(text).toContain('NFR-1.4 time-to-interactive target: at most 2200 ms (median) and 2400 ms (p95)');
        expect(text).toContain('Bytes target (whole path, buildings tiles): at most 3,000 B (median)');
        expect(text).toContain('cold-cache assertion passed');
    });

    it('marks the targets unknown when run B is missing', () => {
        const text = renderReport([run('A', [1000])], { label: 'before', date: '2026-09-16' });
        expect(text).toContain('NFR-1.4 time-to-interactive target: Unknown — to be confirmed when run B is recorded');
    });

    it('compares an "after" run B against the baseline', () => {
        const before = run('B', [2000, 2200, 2100], 2);
        const after = { ...run('B', [1500, 1600, 1700]), label: 'after' as const, stack: 'maplibre' as const };
        const text = renderReport([after], { label: 'after', date: '2026-10-20', baseline: [before], baselineDate: '2026-09-16' });
        expect(text).toContain('Baseline: `docs/benchmarks/2026-09-16-map-before.md`');
        expect(text).toContain('| Time-to-interactive | 2100 ms | 1600 ms | pass |');
        expect(text).toContain('| Bytes, buildings tiles | 3,000 B | 1,500 B | pass |');
        expect(text).toContain('| Bytes, everything | 3,200 B | 1,700 B | pass |');
        expect(text).toContain('| Initial load | 2100 ms | 1600 ms | pass | 2,000 B | 1,000 B | pass |');
        expect(text).toContain('| Zoom 12 to 13 | 400 ms | 400 ms | pass | 1,000 B | 500 B | pass |');
    });
});
