/**
 * The benchmark result record (one JSON file per run) and the statistics derived from it.
 * The JSON is the raw evidence a result file cites; the markdown is rendered from it by
 * report.ts. Changing this shape is a new `formatVersion`.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1). No Playwright dependency.
 */
import { median, percentile95, SegmentSummary } from './metrics';
import { RunId, RunLabel } from './run-config';
import { ThrottleProfile } from './throttle-profiles';

export const RESULT_FORMAT_VERSION = 1;
export const METHOD_VERSION = 1;
/** The segment whose duration is the time-to-interactive. */
export const INITIAL_LOAD_SEGMENT_ID = 'initial-load';

export interface SegmentResult {
    id: string;
    name: string;
    /** Wall-clock time from the gesture to the map settling, in milliseconds. */
    durationMs: number;
    /** Latency of every buildings-tile response served over the network in this segment. */
    tileLatenciesMs: number[];
    summary: SegmentSummary;
}

export interface RepetitionResult {
    index: number;
    startedAt: string;
    /** Navigation start to the first time the map settled (all tiles loaded, nothing in flight). */
    timeToInteractiveMs: number;
    navigation: { domContentLoadedMs: number; loadEventEndMs: number };
    segments: SegmentResult[];
    /** URLs served from cache without an earlier network fetch in this repetition; must be empty. */
    coldCacheViolations: string[];
}

export interface RunResult {
    formatVersion: number;
    methodVersion: number;
    label: RunLabel;
    run: RunId;
    runDescription: string;
    stack: 'leaflet' | 'maplibre';
    date: string;
    recordedAt: string;
    device: string;
    connection: string;
    browser: { name: string; version: string; headless: boolean };
    viewport: { width: number; height: number } | null;
    baseUrl: string;
    cdnOrProxy: string;
    throttle: ThrottleProfile | null;
    scriptCommit: string;
    pathFile: { path: string; sha256: string };
    repetitions: RepetitionResult[];
}

export interface MetricStats {
    median: number | null;
    p95: number | null;
    /** Number of repetitions that produced a value. */
    n: number;
}

export interface SegmentStats {
    id: string;
    name: string;
    durationMs: MetricStats;
    tileCount: MetricStats;
    tilesReused: MetricStats;
    bytesBuildingsTiles: MetricStats;
    bytesBasemap: MetricStats;
    bytesTotal: MetricStats;
}

export interface RunStats {
    repetitions: number;
    coldCacheOk: boolean;
    timeToInteractiveMs: MetricStats;
    /** Per repetition, the p95 buildings-tile latency across the whole path; then median and p95 across repetitions. */
    tileLatencyP95Ms: MetricStats;
    /** Whole-path bytes per repetition. */
    bytesBuildingsTiles: MetricStats;
    bytesBasemap: MetricStats;
    bytesTotal: MetricStats;
    unmeasuredResponses: number;
    segments: SegmentStats[];
}

export function stats(values: Array<number | null>): MetricStats {
    const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return { median: median(present), p95: percentile95(present), n: present.length };
}

export function summariseRun(run: RunResult): RunStats {
    const reps = run.repetitions;
    const segmentIds = reps.length > 0 ? reps[0].segments.map(s => ({ id: s.id, name: s.name })) : [];

    const perRepetition = (pick: (rep: RepetitionResult) => number | null) => stats(reps.map(pick));
    const sumSegments = (rep: RepetitionResult, pick: (s: SegmentSummary) => number) =>
        rep.segments.reduce((total, s) => total + pick(s.summary), 0);

    return {
        repetitions: reps.length,
        coldCacheOk: reps.every(rep => rep.coldCacheViolations.length === 0),
        timeToInteractiveMs: perRepetition(rep => rep.timeToInteractiveMs),
        tileLatencyP95Ms: perRepetition(rep => pathTileLatencyP95(rep)),
        bytesBuildingsTiles: perRepetition(rep => sumSegments(rep, s => s.bytes.buildingsTiles)),
        bytesBasemap: perRepetition(rep => sumSegments(rep, s => s.bytes.basemap)),
        bytesTotal: perRepetition(rep => sumSegments(rep, s => s.bytes.total)),
        unmeasuredResponses: reps.reduce((total, rep) => total + sumSegments(rep, s => s.bytes.unmeasuredCount), 0),
        segments: segmentIds.map(({ id, name }) => {
            const perSegment = (pick: (s: SegmentResult) => number | null) =>
                stats(reps.map(rep => {
                    const segment = rep.segments.find(s => s.id === id);
                    return segment ? pick(segment) : null;
                }));
            return {
                id,
                name,
                durationMs: perSegment(s => s.durationMs),
                tileCount: perSegment(s => s.summary.tiles.count),
                tilesReused: perSegment(s => s.summary.tiles.reused),
                bytesBuildingsTiles: perSegment(s => s.summary.bytes.buildingsTiles),
                bytesBasemap: perSegment(s => s.summary.bytes.basemap),
                bytesTotal: perSegment(s => s.summary.bytes.total)
            };
        })
    };
}

/** The per-tile latency p95 across the whole path of one repetition (buildings tiles only). */
function pathTileLatencyP95(rep: RepetitionResult): number | null {
    const latencies = rep.segments.reduce<number[]>((all, s) => all.concat(s.tileLatenciesMs), []);
    return percentile95(latencies);
}
