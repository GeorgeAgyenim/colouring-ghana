/**
 * Network capture over the Chrome DevTools Protocol for one page: which responses came from
 * the browser cache (the cold-cache control of method v1), how many requests are in flight
 * (part of "the map has settled"), and bytes on the wire for responses whose Performance
 * API entry hides them (cross-origin without Timing-Allow-Origin, such as the OSM basemap).
 * Also applies the run B throttle profile.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1). Chromium only, by design.
 */
import { CDPSession, Page } from '@playwright/test';

import { NetworkRecord } from './metrics';
import { ThrottleProfile } from './throttle-profiles';

interface RequestWillBeSent {
    requestId: string;
    request: { url: string };
}

interface ResponseReceived {
    requestId: string;
    response: {
        url: string;
        fromDiskCache?: boolean;
        fromPrefetchCache?: boolean;
        fromServiceWorker?: boolean;
    };
}

interface LoadingFinished {
    requestId: string;
    encodedDataLength: number;
}

export class NetworkCapture {
    /** Every response in arrival order, for the cold-cache rule. */
    readonly records: NetworkRecord[] = [];

    private readonly urlByRequest = new Map<string, string>();
    private readonly cachedRequests = new Set<string>();
    private readonly bytesByUrl = new Map<string, number>();
    private readonly lastResponseCached = new Set<string>();
    private readonly pending = new Set<string>();

    private constructor(private readonly session: CDPSession) {}

    static async attach(page: Page): Promise<NetworkCapture> {
        const session = await page.context().newCDPSession(page);
        const capture = new NetworkCapture(session);
        capture.listen();
        await session.send('Network.enable');
        return capture;
    }

    /**
     * Empties the browser cache and cookies. Used where a fresh browser context cannot be
     * created (Android Chrome over remote debugging refuses `Target.createBrowserContext`);
     * the cold-cache assertion then proves the cache was empty.
     */
    async clearBrowserState(): Promise<void> {
        await this.session.send('Network.clearBrowserCache');
        await this.session.send('Network.clearBrowserCookies');
    }

    async throttle(profile: ThrottleProfile): Promise<void> {
        await this.session.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: profile.latencyMs,
            downloadThroughput: profile.downloadBytesPerSecond,
            uploadThroughput: profile.uploadBytesPerSecond
        });
    }

    /** Requests started but not yet finished or failed. */
    get inFlight(): number {
        return this.pending.size;
    }

    /** How the capture last saw a URL, for diagnostics: never requested, still in flight, or finished. */
    describeUrl(url: string): string {
        if (this.pendingUrls().includes(url)) {
            return 'in flight';
        }
        const seen = this.records.filter(r => r.url === url);
        return seen.length === 0 ? 'never requested' : `finished ${seen.length} time(s)${seen[seen.length - 1].fromCache ? ', from cache' : ''}`;
    }

    /** URLs of the requests still in flight, for diagnostics. */
    pendingUrls(): string[] {
        return Array.from(this.pending).map(id => this.urlByRequest.get(id) ?? id);
    }

    /** Bytes on the wire for the most recent network response of a URL; undefined if unknown. */
    bytesFor(url: string): number | undefined {
        return this.bytesByUrl.get(url);
    }

    /** True if the most recent response for the URL was served from cache. */
    wasServedFromCache(url: string): boolean {
        return this.lastResponseCached.has(url);
    }

    async detach(): Promise<void> {
        await this.session.detach();
    }

    private listen(): void {
        this.session.on('Network.requestWillBeSent', (event: RequestWillBeSent) => {
            this.urlByRequest.set(event.requestId, event.request.url);
            this.pending.add(event.requestId);
        });
        this.session.on('Network.requestServedFromCache', (event: { requestId: string }) => {
            this.cachedRequests.add(event.requestId);
        });
        this.session.on('Network.responseReceived', (event: ResponseReceived) => {
            const { response } = event;
            if (response.fromDiskCache || response.fromPrefetchCache || response.fromServiceWorker) {
                this.cachedRequests.add(event.requestId);
            }
        });
        this.session.on('Network.loadingFinished', (event: LoadingFinished) => {
            this.finish(event.requestId, event.encodedDataLength);
        });
        this.session.on('Network.loadingFailed', (event: { requestId: string }) => {
            this.finish(event.requestId, 0);
        });
    }

    private finish(requestId: string, encodedDataLength: number): void {
        this.pending.delete(requestId);
        const url = this.urlByRequest.get(requestId);
        if (url === undefined) {
            return;
        }
        const fromCache = this.cachedRequests.has(requestId);
        this.records.push({ url, fromCache });
        if (fromCache) {
            this.lastResponseCached.add(url);
        } else {
            this.lastResponseCached.delete(url);
            this.bytesByUrl.set(url, encodedDataLength);
        }
        this.urlByRequest.delete(requestId);
        this.cachedRequests.delete(requestId);
    }
}
