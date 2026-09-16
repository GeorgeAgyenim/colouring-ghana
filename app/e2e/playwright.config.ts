/**
 * Playwright runner configuration for the on-demand browser suites (benchmark now, the
 * differential smoke test in ticket 10). Not part of `npm test`; run `npm run benchmark:map`.
 *
 * Implements NFR-1.4, NFR-1.5; see docs/tickets/map-migration/PRD.md (Testing Decisions).
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: /.*\.e2e\.ts$/,
    outputDir: './test-results',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    // A throttled run of five repetitions takes minutes; each test manages its own waits.
    timeout: 0,
    reporter: [['list']],
    use: {
        actionTimeout: 60000,
        navigationTimeout: 120000
    }
});
