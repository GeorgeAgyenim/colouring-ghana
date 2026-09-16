/**
 * Reads the measurements method v1 names from the page: Navigation Timing and the
 * Performance API resource entries (per-resource timing and transfer size).
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1).
 */
import { Page } from '@playwright/test';

/** Chrome keeps 250 resource entries by default; a throttled path has far more. */
const RESOURCE_BUFFER_SIZE = 50000;

export interface ResourceEntryLite {
    name: string;
    startTime: number;
    responseEnd: number;
    transferSize: number;
    encodedBodySize: number;
}

export interface NavigationTimingLite {
    domContentLoadedMs: number;
    loadEventEndMs: number;
}

/** Must run before the first navigation so the buffer limit applies from the start. */
export async function preparePageForMeasurement(page: Page): Promise<void> {
    await page.addInitScript(`performance.setResourceTimingBufferSize(${RESOURCE_BUFFER_SIZE});`);
}

/** Milliseconds since navigation start, as the page sees it. */
export async function pageNowMs(page: Page): Promise<number> {
    return page.evaluate(() => performance.now());
}

/** Returns the resource entries recorded so far and clears the buffer for the next segment. */
export async function drainResourceEntries(page: Page): Promise<ResourceEntryLite[]> {
    return page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const lite = entries.map(entry => ({
            name: entry.name,
            startTime: entry.startTime,
            responseEnd: entry.responseEnd,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize
        }));
        performance.clearResourceTimings();
        return lite;
    });
}

export async function readNavigationTiming(page: Page): Promise<NavigationTimingLite> {
    return page.evaluate(() => {
        const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        return {
            domContentLoadedMs: navigation ? navigation.domContentLoadedEventEnd : 0,
            loadEventEndMs: navigation ? navigation.loadEventEnd : 0
        };
    });
}

/** The window size and device pixel ratio the map was rendered at. */
export async function readViewport(page: Page): Promise<{ width: number; height: number; devicePixelRatio: number }> {
    return page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio }));
}
