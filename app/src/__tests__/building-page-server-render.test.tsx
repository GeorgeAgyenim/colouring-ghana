/**
 * @jest-environment node
 */
/*
 * Tickets: docs/tickets/location-search/issues/14-building-pages-fail-on-the-server.md
 *          docs/tickets/location-search/issues/16-server-draws-the-default-category.md
 *
 * A building's address opened directly (a shared link, a bookmark, a reload) is answered by the server with
 * the whole page: the building's data and its form are in the HTML it sends, with or without `?sc=` in the
 * address, in the category and mode the address names. The server's own page route (src/frontendRoute.tsx) is
 * used; the database is replaced, so nothing here can reach one.
 */
import { Request, Response } from 'express';

const assetsManifest = '/test-assets-manifest.json';

jest.mock('/test-assets-manifest.json', () => ({ client: { js: '/static/js/client.js' } }), { virtual: true });

// Building 1 as the database would return it; date_year is shown in the age & history category.
const building = {
    building_id: 1,
    geometry_id: 1,
    revision_id: '1',
    date_year: 1923,
    verified: {},
};

// What the signed-in visitor has answered themselves (kept per person, not on the building).
const visitorsOwnAnswers = { community_building_hominess: 4 };

jest.mock('../api/services/building/base', () => ({
    // as the real service: the visitor's own answers come under user_attributes when asked for
    getBuildingById: (id: number, options?: { userDataOptions?: { userAttributes?: boolean } }) => {
        if (id !== 1) {
            return Promise.resolve(undefined);
        }
        if (options?.userDataOptions?.userAttributes) {
            return Promise.resolve({ ...building, user_attributes: { ...visitorsOwnAnswers } });
        }
        return Promise.resolve({ ...building });
    },
    getBuildingUPRNsById: () => Promise.resolve([]),
    getBuildingPlanningDataById: () => Promise.resolve([]),
    getLatestRevisionId: () => Promise.resolve('1'),
    // the signed-in visitor has verified the building's year
    getUserVerifiedAttributes: () => Promise.resolve({ date_year: 1923 }),
}));

jest.mock('../api/services/user', () => ({
    getUserById: () => Promise.resolve({ username: 'test-user' }),
}));

interface SentPage {
    status: number;
    redirectedTo?: string;
    html: string;
}

/** What the server's page route sends for the address, for a visitor who is signed in or not. */
async function openPage(address: string, signedIn: boolean): Promise<SentPage> {
    const frontendRoute = (await import('../frontendRoute')).default;
    return new Promise((resolve, reject) => {
        const sent: SentPage = { status: 200, html: '' };
        const res = {
            status(code: number) { sent.status = code; return res; },
            send(html: string) { sent.html = html; resolve(sent); return res; },
            redirect(to: string) { sent.redirectedTo = to; resolve(sent); return res; },
        };
        const req = { url: address, session: signedIn ? { user_id: 'a-user' } : {} };
        frontendRoute(req as unknown as Request, res as unknown as Response, reject);
    });
}

/** The part of the page React drew, without the data handed to the script after it. */
function drawnPage(html: string): string {
    const start = html.indexOf('<div id="root">');
    const end = html.indexOf('window.__PRELOADED_STATE__');
    expect(start).toBeGreaterThan(-1);
    return html.slice(start, end);
}

describe('a building page opened directly, as the server sends it', () => {
    const originalEnv = { ...process.env };
    let loggedErrors: jest.SpyInstance;

    beforeAll(() => {
        // read when the page route is loaded, so set before the first openPage
        process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        loggedErrors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test.each([
        '/view/age-history/1',
        '/view/age-history/1?sc=2',
    ])('%s answers 200 with the building\'s data and its form', async address => {
        const page = await openPage(address, false);

        expect(loggedErrors).not.toHaveBeenCalled();
        expect(page.status).toBe(200);
        const drawn = drawnPage(page.html);
        expect(drawn).toContain('value="1923"');
        expect(drawn).toContain('<form method="POST"');
    });

    test('?sc=2 opens the matching section of the category', async () => {
        const drawn = drawnPage((await openPage('/view/age-history/1?sc=2', false)).html);

        expect(drawn).toMatch(
            /Building Age\/Construction Date \(Crowdsourced\)<\/span><\/div><div class="data-entry-group-body ">/
        );
    });

    test('/edit/age-history/1 for a signed-in visitor answers 200 with the building\'s data and its form', async () => {
        const page = await openPage('/edit/age-history/1', true);

        expect(loggedErrors).not.toHaveBeenCalled();
        expect(page.status).toBe(200);
        expect(page.redirectedTo).toBeUndefined();
        const drawn = drawnPage(page.html);
        expect(drawn).toContain('value="1923"');
        expect(drawn).toContain('<form method="POST"');
        // drawn in edit mode, as the address says
        expect(drawn).toContain('Save edits');
    });

    test('/view/age-history/1 is drawn in view mode, without the edit buttons', async () => {
        const drawn = drawnPage((await openPage('/view/age-history/1', true)).html);

        expect(drawn).toContain('<form method="POST"');
        expect(drawn).not.toContain('Save edits');
    });

    test('/view/location/1 draws the Location category, not the default one', async () => {
        const page = await openPage('/view/location/1', false);

        expect(loggedErrors).not.toHaveBeenCalled();
        expect(page.status).toBe(200);
        const drawn = drawnPage(page.html);
        expect(drawn).toContain('<section id="location" class="data-section">');
        expect(drawn).toContain('Street name');
        expect(drawn).not.toContain('<section id="age-history"');
        expect(drawn).not.toContain('Historical Period/Description');
    });

    test('/view/location/1?sc=1 opens the first section of Location', async () => {
        const drawn = drawnPage((await openPage('/view/location/1?sc=1', false)).html);

        expect(drawn).toContain('<section id="location" class="data-section">');
        expect(drawn).toMatch(
            /Individual Building\/Property Address<\/span><\/div><div class="data-entry-group-body ">/
        );
    });

    test('the page drawn for a signed-in visitor shows their own answers', async () => {
        const drawn = drawnPage((await openPage('/view/community/1', true)).html);

        expect(drawn).toContain('<section id="community" class="data-section">');
        // their score for how homey the building feels (React puts an empty comment between the two texts)
        expect(drawn).toContain('Your score: <!-- -->4<!-- -->');
    });

    test('the page drawn for a signed-in visitor shows what they have verified', async () => {
        const drawn = drawnPage((await openPage('/view/age-history/1', true)).html);

        expect(drawn).toContain('Verified as');
        expect(drawn).toContain('title="Remove my verification"');
    });

    test('/edit/age-history/1 for a visitor who is not signed in is sent to the log-in page', async () => {
        const page = await openPage('/edit/age-history/1', false);

        expect(page.redirectedTo).toBe('/login.html');
    });
});
