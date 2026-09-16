/**
 * Map benchmark: drives Chromium through the shared path (`app/e2e/map-path.json`) and
 * records time-to-interactive, per-tile latency and bytes per segment, following
 * docs/benchmarks/map-migration-method.md version 1. One run (A, B or C) per invocation;
 * five repetitions, each in a fresh browser context; the cold-cache rule is asserted.
 *
 *   BENCHMARK_RUN=A npm run benchmark:map            # laptop, unthrottled
 *   BENCHMARK_RUN=B npm run benchmark:map            # laptop, fixed slow-4G profile
 *   BENCHMARK_RUN=C BENCHMARK_CDP_ENDPOINT=http://127.0.0.1:9222 npm run benchmark:map
 *
 * Other variables: BENCHMARK_BASE_URL, BENCHMARK_DEVICE, BENCHMARK_CONNECTION, BENCHMARK_DATE,
 * BENCHMARK_LABEL (before|after), BENCHMARK_REPETITIONS, BENCHMARK_HEADED=1, BENCHMARK_OUTPUT_DIR,
 * BENCHMARK_PROXY, BENCHMARK_BASELINE_DATE (after runs). See docs/features/map-migration.md, "How to test".
 *
 * Implements NFR-1.4, NFR-1.5; see ADR-0027 and docs/tickets/map-migration/PRD.md (seam 5).
 * Ticket: docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md
 */
import { expect, test, Browser, BrowserContext, chromium } from '@playwright/test';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, relative, resolve } from 'path';

import ccConfig from '../../src/cc-config.json';
import { LatLng, loadMapPath, MAP_PATH_FILE, MapPath } from '../map-path';
import { LeafletDriver } from './leaflet-driver';
import { classifyResource, findColdCacheViolations, networkTileLatencies, ResourceClassifier, ResourceSample, summariseSegment } from './metrics';
import { NetworkCapture } from './network-capture';
import { drainResourceEntries, pageNowMs, prepareContextForMeasurement, readNavigationTiming, ResourceEntryLite } from './page-measure';
import { renderReport } from './report';
import { INITIAL_LOAD_SEGMENT_ID, RepetitionResult, RESULT_FORMAT_VERSION, RunResult, SegmentResult, METHOD_VERSION } from './results';
import { describeRun, readRunConfig, RunConfig } from './run-config';
import { pixelOffset, splitIntoDrags } from './web-mercator';

const APP_DIR = resolve(__dirname, '../..');
const REPO_DIR = resolve(APP_DIR, '..');
/** Keeps every drag inside the map container on the laptop viewport. */
const MAX_DRAG_PX = 300;
/** Generous: a throttled zoom step at zoom 12 loads many tiles. */
const SETTLE_TIMEOUT_MS = 180000;
const SELECTION_TIMEOUT_MS = 60000;

test('map benchmark run', async () => {
    const config = readRunConfig(process.env, APP_DIR);
    const mapPath = loadMapPath();
    const classifier: ResourceClassifier = {
        siteOrigin: new URL(config.baseUrl).origin,
        basemapHost: new URL(ccConfig.basemapTileUrl).host
    };
    test.info().annotations.push({ type: 'run', description: `${config.run} — ${describeRun(config.run)}, ${config.repetitions} repetitions against ${config.baseUrl}` });

    const browser = await openBrowser(config);
    const repetitions: RepetitionResult[] = [];
    try {
        for (let index = 1; index <= config.repetitions; index++) {
            console.log(`Run ${config.run}: repetition ${index} of ${config.repetitions}`);
            repetitions.push(await runRepetition(browser, config, mapPath, classifier, index));
        }
    } finally {
        await browser.close();
    }
    expect(repetitions).toHaveLength(config.repetitions);

    const result: RunResult = {
        formatVersion: RESULT_FORMAT_VERSION,
        methodVersion: METHOD_VERSION,
        label: config.label,
        run: config.run,
        runDescription: describeRun(config.run),
        stack: 'leaflet',
        date: config.date,
        recordedAt: new Date().toISOString(),
        device: config.device,
        connection: config.connection,
        browser: { name: browser.browserType().name(), version: browser.version(), headless: config.headless },
        viewport: config.viewport,
        baseUrl: config.baseUrl,
        cdnOrProxy: config.cdnOrProxy,
        throttle: config.throttle,
        scriptCommit: describeScriptCommit(),
        pathFile: { path: relative(REPO_DIR, MAP_PATH_FILE), sha256: sha256OfFile(MAP_PATH_FILE) },
        repetitions
    };

    const written = writeResult(config, result);
    console.log(`Wrote ${written.json} and ${written.markdown}`);
});

async function openBrowser(config: RunConfig): Promise<Browser> {
    if (config.cdpEndpoint) {
        return chromium.connectOverCDP(config.cdpEndpoint);
    }
    return chromium.launch({ headless: config.headless });
}

async function runRepetition(browser: Browser, config: RunConfig, mapPath: MapPath, classifier: ResourceClassifier, index: number): Promise<RepetitionResult> {
    const startedAt = new Date().toISOString();
    const context: BrowserContext = await browser.newContext({ viewport: config.viewport });
    try {
        await prepareContextForMeasurement(context);
        const page = await context.newPage();
        const capture = await NetworkCapture.attach(page);
        if (config.throttle) {
            await capture.throttle(config.throttle);
        }
        const driver = new LeafletDriver(page, capture);
        const segments: SegmentResult[] = [];

        /** Closes a segment: drains the resource entries recorded since the last drain and aggregates them. */
        const recordSegment = async (id: string, name: string, startMs: number, settledMs: number): Promise<void> => {
            const entries = await drainResourceEntries(page);
            const samples = attributeSamples(entries, capture, classifier);
            segments.push({
                id,
                name,
                durationMs: settledMs - startMs,
                tileLatenciesMs: networkTileLatencies(samples),
                summary: summariseSegment(samples)
            });
        };

        const runSegment = async (id: string, name: string, action: () => Promise<void>): Promise<void> => {
            const startMs = await pageNowMs(page);
            await action();
            const settledMs = await driver.waitForSettled(SETTLE_TIMEOUT_MS);
            await recordSegment(id, name, startMs, settledMs);
        };

        // 1. Initial viewport. Time-to-interactive is navigation start to the first settle.
        let centre: LatLng = mapPath.start.position;
        let zoom = mapPath.start.zoom;
        await page.goto(`${config.baseUrl}${mapPath.start.path}`, { waitUntil: 'domcontentloaded' });
        const timeToInteractiveMs = await driver.waitForSettled(SETTLE_TIMEOUT_MS);
        const navigation = await readNavigationTiming(page);
        await recordSegment(INITIAL_LOAD_SEGMENT_ID, 'Initial load', 0, timeToInteractiveMs);

        // 2. Pan to the first named place at the start zoom.
        const [placeOne, placeTwo] = mapPath.places;
        await runSegment('pan-1', `Pan to ${placeOne.name} (zoom ${zoom})`, async () => {
            await panTo(driver, centre, placeOne.position, zoom);
            centre = placeOne.position;
        });

        // Transition: zoom out to the first zoom step, one level at a time.
        await runSegment(`zoom-out-${zoom}-to-${mapPath.zoomSteps.from}`, `Zoom out ${zoom} to ${mapPath.zoomSteps.from} (transition)`, async () => {
            while (zoom > mapPath.zoomSteps.from) {
                await driver.zoomOut();
                await driver.waitForSettled(SETTLE_TIMEOUT_MS);
                zoom -= 1;
            }
        });

        // Pan to the second named place at the first zoom step.
        await runSegment('pan-2', `Pan to ${placeTwo.name} (zoom ${zoom})`, async () => {
            await panTo(driver, centre, placeTwo.position, zoom);
            centre = placeTwo.position;
        });

        // 3. Zoom steps, one level at a time.
        while (zoom < mapPath.zoomSteps.to) {
            const next = zoom + 1;
            await runSegment(`zoom-${zoom}-to-${next}`, `Zoom ${zoom} to ${next}`, async () => {
                await driver.zoomIn();
            });
            zoom = next;
        }

        // 4. Category switches.
        for (const change of mapPath.categorySwitches) {
            await runSegment(`category-${change.categorySlug}`, `Switch colouring to ${change.name} (${change.tileset})`, async () => {
                await driver.switchCategory(change.categorySlug);
            });
        }

        // 5. Select the fixed building.
        await runSegment('select-building', `Select ${mapPath.building.name}`, async () => {
            const mapCentre = await driver.centre();
            const offset = pixelOffset(centre, mapPath.building.position, zoom);
            await driver.clickAt({ x: Math.round(mapCentre.x + offset.x), y: Math.round(mapCentre.y + offset.y) });
            try {
                await page.waitForURL(url => /\/view\/[^/]+\/\d+/.test(url.pathname), { timeout: SELECTION_TIMEOUT_MS });
            } catch (error) {
                throw new Error(`No building was selected at ${mapPath.building.name} (${mapPath.building.position.lat}, ${mapPath.building.position.lng}): `
                    + 'the locate endpoint returned nothing. Confirm the database has a footprint there or choose another fixed building in the path file.');
            }
        });

        const coldCacheViolations = findColdCacheViolations(capture.records);
        if (coldCacheViolations.length > 0) {
            throw new Error(`Cold-cache assertion failed in repetition ${index}: ${coldCacheViolations.length} response(s) came from the cache `
                + `without an earlier fetch in this repetition, for example ${coldCacheViolations.slice(0, 3).join(', ')}`);
        }
        await capture.detach();

        return { index, startedAt, timeToInteractiveMs, navigation, segments, coldCacheViolations };
    } finally {
        await context.close();
    }
}

/** Moves the view centre from one position to another with exact drags. */
async function panTo(driver: LeafletDriver, from: LatLng, to: LatLng, zoom: number): Promise<void> {
    const offset = pixelOffset(from, to, zoom);
    for (const drag of splitIntoDrags(offset, MAX_DRAG_PX)) {
        // Moving the centre east means dragging the map content west.
        await driver.dragBy({ x: -drag.x, y: -drag.y });
    }
}

/** Joins Performance API entries with the network capture (cache reuse, hidden byte counts). */
function attributeSamples(entries: ResourceEntryLite[], capture: NetworkCapture, classifier: ResourceClassifier): ResourceSample[] {
    return entries.map(entry => {
        const reused = capture.wasServedFromCache(entry.name);
        let bytes = 0;
        let bytesSource: ResourceSample['bytesSource'] = 'none';
        if (reused) {
            bytesSource = 'performance';
        } else if (entry.transferSize > 0) {
            bytes = entry.transferSize;
            bytesSource = 'performance';
        } else {
            const captured = capture.bytesFor(entry.name);
            if (captured !== undefined) {
                bytes = captured;
                bytesSource = 'cdp';
            }
        }
        return {
            url: entry.name,
            kind: classifyResource(entry.name, classifier),
            latencyMs: entry.responseEnd - entry.startTime,
            bytes,
            bytesSource,
            reused
        };
    });
}

function describeScriptCommit(): string {
    try {
        const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO_DIR, encoding: 'utf8' }).trim();
        const dirty = execFileSync('git', ['status', '--porcelain', '--', 'app/e2e'], { cwd: REPO_DIR, encoding: 'utf8' }).trim();
        return dirty ? `${commit} (uncommitted changes in app/e2e)` : commit;
    } catch (error) {
        return `Unknown — git unavailable (${(error as Error).message})`;
    }
}

function sha256OfFile(filePath: string): string {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function writeResult(config: RunConfig, result: RunResult): { json: string; markdown: string } {
    const folder = join(config.outputDir, `${config.date}-map-${config.label}`);
    mkdirSync(folder, { recursive: true });
    const jsonPath = join(folder, `run-${config.run}.json`);
    writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');

    const runs = readRuns(folder);
    const baseline = config.label === 'after' ? readBaseline(config) : undefined;
    const markdownPath = join(config.outputDir, `${config.date}-map-${config.label}.md`);
    writeFileSync(markdownPath, renderReport(runs, {
        label: config.label,
        date: config.date,
        baseline: baseline?.runs,
        baselineDate: baseline?.date
    }));
    return { json: jsonPath, markdown: markdownPath };
}

function readRuns(folder: string): RunResult[] {
    return readdirSync(folder)
        .filter(name => /^run-[ABC]\.json$/.test(name))
        .map(name => {
            const parsed = JSON.parse(readFileSync(join(folder, name), 'utf8')) as RunResult;
            if (parsed.formatVersion !== RESULT_FORMAT_VERSION) {
                throw new Error(`${join(folder, name)} has result format ${parsed.formatVersion}; this script writes ${RESULT_FORMAT_VERSION}`);
            }
            return parsed;
        });
}

/** The "before" record an "after" run is judged against: an explicit date, else the newest one. */
function readBaseline(config: RunConfig): { date: string; runs: RunResult[] } | undefined {
    const explicit = process.env.BENCHMARK_BASELINE_DATE;
    const candidates = explicit
        ? [`${explicit}-map-before`]
        : readdirSync(config.outputDir).filter(name => /^\d{4}-\d{2}-\d{2}-map-before$/.test(name)).sort().reverse();
    for (const name of candidates) {
        const folder = join(config.outputDir, name);
        if (existsSync(folder)) {
            return { date: basename(name).slice(0, 10), runs: readRuns(folder) };
        }
    }
    return undefined;
}
