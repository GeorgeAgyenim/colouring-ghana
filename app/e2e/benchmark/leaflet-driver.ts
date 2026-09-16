/**
 * Drives the current Leaflet map through the shared path with real user gestures only
 * (mouse drags, the zoom control, the sidebar category links, a click), so nothing in the
 * Leaflet tree changes for the benchmark (PRD decision 1). Pans are exact pixel drags:
 * Leaflet 1.9 applies no inertia when the pointer rests for more than 50 ms before release.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1); FR-9.5 seam 5.
 */
import { Locator, Page } from '@playwright/test';

import { NetworkCapture } from './network-capture';
import { PixelPoint } from './web-mercator';

const SETTLE_POLL_MS = 100;
/** How long nothing may change before the map counts as settled. */
const SETTLE_QUIET_MS = 500;
const DRAG_STEPS = 12;
/** Longer than Leaflet's 50 ms inertia window. */
const DRAG_REST_MS = 120;

export class LeafletDriver {
    private readonly container: Locator;

    constructor(private readonly page: Page, private readonly capture: NetworkCapture) {
        this.container = page.locator('.leaflet-container');
    }

    /**
     * Waits until every Leaflet tile has loaded, no zoom animation is running, no request is
     * in flight and the resource count has been stable for SETTLE_QUIET_MS. This is the
     * Leaflet counterpart of MapLibre's `idle` event named in method v1. Returns the page
     * time (`performance.now()`) at which the map was first seen settled, so the quiet
     * window itself is not counted in any timing.
     */
    async waitForSettled(timeoutMs: number): Promise<number> {
        const deadline = Date.now() + timeoutMs;
        let quietSince: number | null = null;
        let settledAtPageMs = 0;
        let lastResourceCount = -1;
        let lastPending = -1;

        while (Date.now() < deadline) {
            const state = await this.page.evaluate(() => {
                const container = document.querySelector('.leaflet-container');
                return {
                    pendingTiles: document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)').length,
                    zooming: container ? container.classList.contains('leaflet-zoom-anim') : false,
                    resourceCount: performance.getEntriesByType('resource').length,
                    mapPresent: container !== null,
                    nowMs: performance.now()
                };
            });
            const inFlight = this.capture.inFlight;
            const busy = !state.mapPresent || state.pendingTiles > 0 || state.zooming || inFlight > 0
                || state.resourceCount !== lastResourceCount || inFlight !== lastPending;
            lastResourceCount = state.resourceCount;
            lastPending = inFlight;

            if (busy) {
                quietSince = null;
            } else if (quietSince === null) {
                quietSince = Date.now();
                settledAtPageMs = state.nowMs;
            } else if (Date.now() - quietSince >= SETTLE_QUIET_MS) {
                return settledAtPageMs;
            }
            await this.page.waitForTimeout(SETTLE_POLL_MS);
        }
        throw new Error(`Map did not settle within ${timeoutMs} ms (tiles still loading or requests in flight)`);
    }

    /** Centre of the map container in viewport pixels. */
    async centre(): Promise<PixelPoint> {
        const box = await this.container.boundingBox();
        if (!box) {
            throw new Error('Leaflet container not found on the page');
        }
        return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    }

    /**
     * Drags the map content by (dx, dy) pixels, which moves the view centre by (-dx, -dy).
     * Verifies against the map pane transform that Leaflet applied exactly that offset.
     */
    async dragBy(delta: PixelPoint): Promise<void> {
        if (delta.x === 0 && delta.y === 0) {
            return;
        }
        const from = await this.centre();
        const before = await this.mapPaneOffset();
        await this.page.mouse.move(from.x, from.y);
        await this.page.mouse.down();
        await this.page.mouse.move(from.x + delta.x, from.y + delta.y, { steps: DRAG_STEPS });
        await this.page.waitForTimeout(DRAG_REST_MS);
        await this.page.mouse.up();
        const after = await this.mapPaneOffset();
        const moved = { x: after.x - before.x, y: after.y - before.y };
        if (moved.x !== delta.x || moved.y !== delta.y) {
            throw new Error(`Drag by (${delta.x}, ${delta.y}) moved the map pane by (${moved.x}, ${moved.y}); the pan is not exact`);
        }
    }

    async zoomIn(): Promise<void> {
        await this.page.locator('.leaflet-control-zoom-in:not(.leaflet-disabled)').click();
    }

    async zoomOut(): Promise<void> {
        await this.page.locator('.leaflet-control-zoom-out:not(.leaflet-disabled)').click();
    }

    /**
     * Opens a category from the sidebar, as a visitor does. On narrow screens the sidebar
     * starts collapsed behind a toggle; it is opened for the click and collapsed again so
     * it does not cover the map for later gestures.
     */
    async switchCategory(categorySlug: string): Promise<void> {
        const toggle = this.page.locator('.info-container-collapse');
        const sidebar = this.page.locator('#sidebar');
        const narrow = await toggle.isVisible();
        if (narrow && await sidebar.evaluate(el => el.classList.contains('offscreen'))) {
            await toggle.click();
        }
        await this.page.locator(`a.category-link.background-${categorySlug}`).click();
        await this.page.waitForURL(url => url.pathname.includes(`/view/${categorySlug}`));
        if (narrow) {
            await toggle.click();
        }
    }

    /** Clicks a viewport point on the map (mouse down and up without movement). */
    async clickAt(point: PixelPoint): Promise<void> {
        await this.page.mouse.click(point.x, point.y);
    }

    private async mapPaneOffset(): Promise<PixelPoint> {
        return this.page.evaluate(() => {
            const pane = document.querySelector('.leaflet-map-pane') as HTMLElement | null;
            const transform = pane ? pane.style.transform : '';
            const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(transform);
            return match ? { x: Math.round(Number(match[1])), y: Math.round(Number(match[2])) } : { x: 0, y: 0 };
        });
    }
}
