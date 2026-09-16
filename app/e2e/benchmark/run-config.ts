/**
 * Reads the benchmark run configuration from environment variables and validates it, so a
 * mis-typed run letter or a missing device name fails before the browser starts.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1). No Playwright dependency.
 */
import { resolve } from 'path';

import { RUN_B_THROTTLE, ThrottleProfile } from './throttle-profiles';

export type RunId = 'A' | 'B' | 'C';
export type RunLabel = 'before' | 'after';
export type ColdCacheMethod = 'fresh-context' | 'cleared-cache';

/** Wording required by docs/DOCUMENTATION.md rule 9 when a fact is not yet known. */
export const UNKNOWN_DEVICE = 'Unknown — to be confirmed by the product owner';

export const DEFAULT_REPETITIONS = 5;
export const DEFAULT_BASE_URL = 'http://localhost:3000';
/** Laptop runs use a fixed window so tile counts per segment are comparable across dates. */
export const LAPTOP_VIEWPORT = { width: 1280, height: 800 };

export interface RunConfig {
    run: RunId;
    label: RunLabel;
    baseUrl: string;
    repetitions: number;
    device: string;
    connection: string;
    /** ISO date (YYYY-MM-DD) used in the result file names. */
    date: string;
    /** Chrome remote-debugging endpoint for run C, for example http://127.0.0.1:9222. */
    cdpEndpoint: string | null;
    throttle: ThrottleProfile | null;
    /** null lets a remote (phone) browser keep its own window size. */
    viewport: { width: number; height: number } | null;
    /** A remote (phone) browser is always headed; laptop runs are headless unless BENCHMARK_HEADED=1. */
    headless: boolean;
    /**
     * How each repetition starts cold: a fresh browser context, or (Android Chrome over remote
     * debugging, which cannot create contexts) a new page after clearing the cache and cookies.
     */
    coldCacheMethod: ColdCacheMethod;
    /** Directory that receives `<date>-map-<label>/run-<X>.json` and `<date>-map-<label>.md`. */
    outputDir: string;
    /** What sits between the browser and the server (method v1, Controls); "none" in E0. */
    cdnOrProxy: string;
}

const RUN_DESCRIPTIONS: Record<RunId, string> = {
    A: 'laptop, unthrottled',
    B: 'laptop, fixed throttle profile',
    C: 'Android phone via remote debugging, mobile data'
};

export function describeRun(run: RunId): string {
    return RUN_DESCRIPTIONS[run];
}

export function readRunConfig(env: NodeJS.ProcessEnv, appDir: string, today: Date = new Date()): RunConfig {
    const run = env.BENCHMARK_RUN?.toUpperCase();
    if (run !== 'A' && run !== 'B' && run !== 'C') {
        throw new Error('BENCHMARK_RUN must be A (laptop, unthrottled), B (laptop, throttled) or C (Android phone via remote debugging)');
    }

    const label = env.BENCHMARK_LABEL ?? 'before';
    if (label !== 'before' && label !== 'after') {
        throw new Error('BENCHMARK_LABEL must be "before" or "after"');
    }

    const repetitions = env.BENCHMARK_REPETITIONS === undefined ? DEFAULT_REPETITIONS : Number(env.BENCHMARK_REPETITIONS);
    if (!Number.isInteger(repetitions) || repetitions < 1) {
        throw new Error('BENCHMARK_REPETITIONS must be a positive integer');
    }

    const cdpEndpoint = env.BENCHMARK_CDP_ENDPOINT ?? null;
    if (run === 'C' && !cdpEndpoint) {
        throw new Error('Run C needs BENCHMARK_CDP_ENDPOINT (Chrome remote-debugging URL of the phone, for example http://127.0.0.1:9222 after `adb forward tcp:9222 localabstract:chrome_devtools_remote`)');
    }

    const date = env.BENCHMARK_DATE ?? today.toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('BENCHMARK_DATE must be YYYY-MM-DD');
    }

    return {
        run,
        label,
        baseUrl: (env.BENCHMARK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
        repetitions,
        device: nonEmpty(env.BENCHMARK_DEVICE) ?? UNKNOWN_DEVICE,
        connection: nonEmpty(env.BENCHMARK_CONNECTION) ?? defaultConnection(run),
        date,
        cdpEndpoint,
        throttle: run === 'B' ? RUN_B_THROTTLE : null,
        viewport: run === 'C' ? null : LAPTOP_VIEWPORT,
        headless: run !== 'C' && env.BENCHMARK_HEADED !== '1',
        coldCacheMethod: run === 'C' ? 'cleared-cache' : 'fresh-context',
        outputDir: resolve(appDir, env.BENCHMARK_OUTPUT_DIR ?? '../docs/benchmarks'),
        cdnOrProxy: nonEmpty(env.BENCHMARK_PROXY) ?? 'none'
    };
}

function defaultConnection(run: RunId): string {
    switch (run) {
    case 'A': return 'Unknown — to be confirmed by the product owner (office connection, unthrottled)';
    case 'B': return `Playwright network throttling, ${RUN_B_THROTTLE.description}`;
    case 'C': return 'Unknown — to be confirmed by the product owner (mobile data)';
    }
}

function nonEmpty(value: string | undefined): string | undefined {
    return value !== undefined && value.trim() !== '' ? value.trim() : undefined;
}
