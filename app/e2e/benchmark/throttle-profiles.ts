/**
 * Network throttle profiles for the benchmark (method v1, run B). The values are recorded
 * here, not in a browser preset, so the run is reproducible whatever DevTools calls the
 * preset later.
 *
 * Implements NFR-1.4, NFR-1.5; see docs/benchmarks/map-migration-method.md.
 */
export interface ThrottleProfile {
    name: string;
    description: string;
    latencyMs: number;
    downloadBytesPerSecond: number;
    uploadBytesPerSecond: number;
}

/**
 * Chrome DevTools "Slow 4G" preset (called "Fast 3G" before Chrome 121):
 * 562.5 ms round-trip latency, 1.6 Mbit/s x 0.9 down, 750 kbit/s x 0.9 up.
 */
export const RUN_B_THROTTLE: ThrottleProfile = {
    name: 'slow-4g',
    description: 'Chrome DevTools "Slow 4G" preset (formerly "Fast 3G"): 562.5 ms latency, 1.44 Mbit/s down, 675 kbit/s up',
    latencyMs: 562.5,
    downloadBytesPerSecond: 180000,
    uploadBytesPerSecond: 84375
};
