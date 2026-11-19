/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/18-london-leftovers.md
 *
 * A link to the site shared in a chat or a post shows a preview built from the tags the server puts at the top
 * of every page. The preview names Colouring Ghana, points at the site's own public address and shows an image
 * this site serves; nothing in it is the London project's. The server's own page route (src/frontendRoute.tsx)
 * is used; the database is replaced, so nothing here can reach one.
 */
import { Request, Response } from 'express';

const assetsManifest = '/test-assets-manifest.json';

jest.mock('/test-assets-manifest.json', () => ({ client: { js: '/static/js/client.js' } }), { virtual: true });

jest.mock('../api/services/building/base', () => ({
    getBuildingById: () => Promise.resolve(undefined),
    getBuildingUPRNsById: () => Promise.resolve([]),
    getBuildingPlanningDataById: () => Promise.resolve([]),
    getLatestRevisionId: () => Promise.resolve('1'),
    getUserVerifiedAttributes: () => Promise.resolve({}),
}));

jest.mock('../api/services/user', () => ({
    getUserById: () => Promise.resolve(undefined),
}));

const siteAddress = 'https://ngci.encs.concordia.ca/colouringghana';

/** The page the server's page route sends for the address, to a visitor who is not signed in. */
async function sentPage(address: string): Promise<string> {
    const frontendRoute = (await import('../frontendRoute')).default;
    return new Promise((resolve, reject) => {
        const res = {
            status() { return res; },
            send(html: string) { resolve(html); return res; },
            redirect(to: string) { reject(new Error(`redirected to ${to}`)); return res; },
        };
        const req = { url: address, session: {} };
        frontendRoute(req as unknown as Request, res as unknown as Response, reject);
    });
}

/** The content of the link-preview tag with this property (e.g. og:url), as written in the page. */
function previewTag(html: string, property: string): string | undefined {
    const tag = html.match(new RegExp(`<meta property="${property}"\\s+content="([^"]*)"`));
    return tag?.[1];
}

describe('the link preview of a page the server sends', () => {
    const originalEnv = { ...process.env };

    beforeAll(() => {
        // read when the page route is loaded, so set before the first sentPage
        process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('points at the site\'s public address', async () => {
        expect(previewTag(await sentPage('/'), 'og:url')).toBe(siteAddress);
    });

    test('shows an image the site itself serves, by its full address', async () => {
        expect(previewTag(await sentPage('/'), 'og:image')).toMatch(
            new RegExp(`^${siteAddress.replace(/\./g, '\\.')}/images/.+`)
        );
    });

    test('describes Colouring Ghana, not the London project', async () => {
        const description = previewTag(await sentPage('/'), 'og:description');

        expect(description).toContain('Colouring Ghana');
        expect(description).toContain('Kwame Nkrumah University of Science and Technology');
        for (const londonName of ['London', 'Bartlett', 'UCL', 'University College']) {
            expect(description).not.toContain(londonName);
        }
    });

    test('is titled Colouring Ghana', async () => {
        expect(previewTag(await sentPage('/'), 'og:title')).toBe('Colouring Ghana');
    });
});

describe('the link preview when the city settings contain quotes or angle brackets', () => {
    const originalEnv = { ...process.env };

    beforeAll(() => {
        process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.dontMock('../cc-config.json');
        jest.resetModules();
    });

    test('the settings are written as text, so they cannot end a tag or add one', async () => {
        jest.resetModules();
        jest.doMock('../cc-config.json', () => ({
            ...jest.requireActual<Record<string, unknown>>('../cc-config.json'),
            cityName: 'A "quoted" <b>city</b>',
            institution: 'The "Institute" & <i>co</i>',
        }));
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const html = await sentPage('/');
        const head = html.slice(0, html.indexOf('</head>'));

        expect(previewTag(html, 'og:title')).toBe('Colouring A &quot;quoted&quot; &lt;b&gt;city&lt;/b&gt;');
        expect(previewTag(html, 'og:description'))
            .toContain('The &quot;Institute&quot; &amp; &lt;i&gt;co&lt;/i&gt;');
        expect(head).not.toContain('<b>');
        expect(head).not.toContain('<i>');
        expect(head).toContain('<title>Colouring A &quot;quoted&quot; &lt;b&gt;city&lt;/b&gt;</title>');

        jest.restoreAllMocks();
    });
});
