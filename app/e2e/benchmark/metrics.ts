/**
 * Pure measurement helpers for the map benchmark: statistics, resource classification,
 * per-segment aggregation and the cold-cache rule. No Playwright dependency so jest
 * can test every rule directly.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1, docs/benchmarks/map-migration-method.md).
 */

/** Median of a sample; null when the sample is empty. */
export function median(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** 95th percentile by the nearest-rank method; null when the sample is empty. */
export function percentile95(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.max(1, Math.ceil(0.95 * sorted.length));
    return sorted[rank - 1];
}

/**
 * What a resource is, for the byte and latency breakdown. "buildings-tiles" is the layer the
 * migration replaces: Mapnik `/tiles/` PNGs before, the PMTiles archive range requests and the
 * edits-since overlay after. The basemap is identical before and after (method v1, Controls).
 */
export type ResourceKind = 'buildings-tiles' | 'basemap' | 'api' | 'other';

export interface ResourceClassifier {
    /** Origin of the site under test, for example `http://localhost:3000`. */
    siteOrigin: string;
    /** Host of the OSM raster basemap from cc-config.json `basemapTileUrl`. */
    basemapHost: string;
}

export function classifyResource(url: string, classifier: ResourceClassifier): ResourceKind {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch (error) {
        return 'other';
    }
    if (parsed.host === classifier.basemapHost) {
        return 'basemap';
    }
    if (parsed.origin !== classifier.siteOrigin) {
        return 'other';
    }
    if (isBuildingsTilePath(parsed.pathname)) {
        return 'buildings-tiles';
    }
    if (parsed.pathname.includes('/api/')) {
        return 'api';
    }
    return 'other';
}

function isBuildingsTilePath(pathname: string): boolean {
    return pathname.includes('/tiles/')
        || pathname.endsWith('.pmtiles')
        || pathname.includes('/api/buildings/edited-since');
}

/** One resource fetched during a segment, after timing and byte attribution. */
export interface ResourceSample {
    url: string;
    kind: ResourceKind;
    /** Response end minus request start, from the Performance API resource entry. */
    latencyMs: number;
    /** Bytes on the wire (headers plus body). */
    bytes: number;
    /**
     * Where the byte count came from: the Performance API (`transferSize`), the CDP network
     * capture (cross-origin responses without Timing-Allow-Origin report transferSize 0), or
     * none (nothing recorded; counts as 0 bytes).
     */
    bytesSource: 'performance' | 'cdp' | 'none';
    /** Served from the browser cache after an earlier fetch in the same repetition. */
    reused: boolean;
}

export interface SegmentSummary {
    tiles: {
        /** Buildings-tile responses served over the network. */
        count: number;
        /** Buildings-tile responses reused from the cache within the repetition. */
        reused: number;
        latencyMedianMs: number | null;
        latencyP95Ms: number | null;
    };
    bytes: {
        buildingsTiles: number;
        basemap: number;
        api: number;
        other: number;
        total: number;
        /** Responses whose bytes the Performance API hid and the CDP capture did not cover. */
        unmeasuredCount: number;
    };
}

/** Latencies of the buildings tiles served over the network (cache reuse excluded). */
export function networkTileLatencies(samples: ResourceSample[]): number[] {
    return samples.filter(s => s.kind === 'buildings-tiles' && !s.reused).map(s => s.latencyMs);
}

/** Aggregates one segment's resources; cache reuse is excluded from latency percentiles. */
export function summariseSegment(samples: ResourceSample[]): SegmentSummary {
    const latencies = networkTileLatencies(samples);
    const reusedTiles = samples.filter(s => s.kind === 'buildings-tiles' && s.reused);

    const bytes = { buildingsTiles: 0, basemap: 0, api: 0, other: 0, total: 0, unmeasuredCount: 0 };
    for (const sample of samples) {
        if (sample.bytesSource === 'none' && !sample.reused) {
            bytes.unmeasuredCount += 1;
        }
        bytes.total += sample.bytes;
        switch (sample.kind) {
        case 'buildings-tiles': bytes.buildingsTiles += sample.bytes; break;
        case 'basemap': bytes.basemap += sample.bytes; break;
        case 'api': bytes.api += sample.bytes; break;
        default: bytes.other += sample.bytes;
        }
    }

    return {
        tiles: {
            count: latencies.length,
            reused: reusedTiles.length,
            latencyMedianMs: median(latencies),
            latencyP95Ms: percentile95(latencies)
        },
        bytes
    };
}

/** One response as seen by the network capture, in the order the browser received them. */
export interface NetworkRecord {
    url: string;
    fromCache: boolean;
}

/**
 * The cold-cache rule (method v1, Controls). A fresh browser context starts with an empty
 * cache, so any cached response must be a reuse of a URL this repetition already fetched over
 * the network. A cached response for a URL never fetched here means the cache was warm.
 * Inline resources (`data:` and `blob:` URLs, such as Leaflet's placeholder tile image) are
 * not network responses and are ignored. Returns the offending URLs.
 */
export function findColdCacheViolations(records: NetworkRecord[]): string[] {
    const fetched = new Set<string>();
    const violations: string[] = [];
    for (const record of records) {
        if (!/^https?:/.test(record.url)) {
            continue;
        }
        if (record.fromCache) {
            if (!fetched.has(record.url)) {
                violations.push(record.url);
            }
        } else {
            fetched.add(record.url);
        }
    }
    return violations;
}
