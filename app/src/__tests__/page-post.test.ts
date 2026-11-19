/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/10-forms-submitted-before-the-script-loads.md
 *
 * What the server does with a form posted to a page address. The account forms and the edit form are
 * sent by POST with no address of their own, so a submit before the page's script has loaded posts
 * to the page the person is on. The server shows that page again and does nothing with what was posted:
 * it is not put into the page and not written to the log.
 * The real server (src/server.tsx) is used, over HTTP on a local port. The database and the map tile
 * renderer are replaced, so nothing here can reach a database.
 */
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { format } from 'util';

const assetsManifest = '/test-assets-manifest.json';
const password = 'a-password-typed-before-the-script-loaded';

jest.mock('/test-assets-manifest.json', () => ({ client: { js: '/static/js/client.js' } }), { virtual: true });

jest.mock('../db', () => ({
    __esModule: true,
    default: {
        // the session store clears out old sessions when it starts
        query: () => Promise.resolve([]),
        // every page asks for the number of the latest edit
        oneOrNone: () => Promise.resolve({ max: '1' })
    }
}));

jest.mock('../api/dataAccess/transaction', () => ({
    startUpdateTransaction: () => {
        throw new Error('This test must not reach the database');
    }
}));

jest.mock('../tiles/tileserver', () => ({
    __esModule: true,
    default: (req: unknown, res: unknown, next: () => void) => next()
}));

interface PageResponse {
    status: number;
    location: string | undefined;
    html: string;
}

function request(port: number, method: 'GET' | 'POST', address: string, form?: string): Promise<PageResponse> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                host: '127.0.0.1', port, path: address, method,
                headers: form == undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }
            },
            response => {
                let html = '';
                response.on('data', chunk => html += chunk);
                response.on('end', () => resolve({
                    status: response.statusCode,
                    location: response.headers.location,
                    html
                }));
            }
        );
        req.on('error', reject);
        req.end(form);
    });
}

describe('a form posted to a page address before the page\'s script has loaded', () => {
    const originalEnv = { ...process.env };

    let server: http.Server;
    let logged: jest.SpyInstance[];

    beforeAll(async () => {
        process.env.RAZZLE_PUBLIC_DIR = path.resolve(__dirname, '../../public');
        process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
        process.env.APP_COOKIE_SECRET = 'not-a-real-secret';

        // loaded here, not imported at the top, because the server reads its settings when it is loaded
        const app = (await import('../server')).default;
        await new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
    });

    afterAll(() => {
        process.env = originalEnv;
        return new Promise(resolve => server.close(resolve));
    });

    beforeEach(() => {
        logged = (['log', 'info', 'warn', 'error', 'debug'] as const)
            .map(level => jest.spyOn(console, level).mockImplementation(() => undefined));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('the log-in page is shown again, exactly as it is when opened', async () => {
        const port = (server.address() as AddressInfo).port;

        const opened = await request(port, 'GET', '/login.html');
        const posted = await request(port, 'POST', '/login.html', `username=someone&password=${password}`);

        expect(posted.status).toBe(200);
        expect(posted.location).toBeUndefined();
        expect(posted.html).toContain('name="password"');
        expect(posted.html).toBe(opened.html);
    });

    test('what was posted is neither put into the page nor written to the log', async () => {
        const port = (server.address() as AddressInfo).port;

        const posted = await request(port, 'POST', '/login.html', `username=someone&password=${password}`);

        expect(posted.html).not.toContain(password);
        // util.format prints an error's message and stack, which JSON.stringify would drop
        const loggedText = logged.flatMap(spy => spy.mock.calls).map(call => format(...call)).join('\n');
        expect(loggedText).not.toContain(password);
        expect(loggedText).not.toContain('someone');
    });
});
