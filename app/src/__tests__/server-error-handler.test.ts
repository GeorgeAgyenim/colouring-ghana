/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/15-api-answers-send-raw-errors.md
 *
 * Errors that no route answers itself (from the page route, the session store, the tile server, or an
 * API answer that fails after it has started) end at the server's own last error handler. It logs them
 * the safe way, without their message, and answers 500, or closes the connection when the answer has
 * already started. They never reach Express's built-in handler, which prints the error's stack (message
 * included) to the log and, outside production, into the page.
 * Express's built-in handler prints nothing while NODE_ENV is 'test', so these tests check that the
 * server's handler is the one that logged, not only that the message is absent.
 * The real server (src/server.tsx) is used, over HTTP on a local port. The database is replaced.
 */
import crypto from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { format } from 'util';

import { refusedQueryError } from '../api/testSupport/databaseErrors';

const assetsManifest = '/test-assets-manifest.json';
const cookieSecret = 'not-a-real-secret';
const EMAIL = 'kwame@example.org';
const SESSION_ID = 'Zk3vQ8sT1nXw5pLr';

const SERVER_HANDLER = 'Server error handler';
const API_HANDLER = 'Global error handler';

jest.mock('/test-assets-manifest.json', () => ({ client: { js: '/static/js/client.js' } }), { virtual: true });

jest.mock('../db', () => ({
    __esModule: true,
    default: {
        // the session store: each test says what it answers
        query: jest.fn(),
        // every page asks for the number of the latest edit
        oneOrNone: () => Promise.resolve({ max: '1' })
    }
}));

jest.mock('../api/dataAccess/transaction', () => ({
    startUpdateTransaction: () => {
        throw new Error('This test must not reach the database');
    }
}));

// the page itself: each test says how it renders
jest.mock('../frontend/app', () => ({
    App: jest.fn()
}));

// a tile answer that fails after it has started
jest.mock('../tiles/tileserver', () => ({
    __esModule: true,
    default: (req: http.IncomingMessage & { path: string }, res: http.ServerResponse, next: (error?: unknown) => void) => {
        if(req.path === '/bad-request.png') {
            // the kind of error Express makes for an address it cannot decode
            return next(Object.assign(new Error(`Failed to decode param '${EMAIL}'`), { status: 400 }));
        }
        if(req.path !== '/started-then-failed.png') {
            return next();
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.write('the start of a tile');
        next(new Error(`Tile failed for ${EMAIL}`));
    }
}));

// an API answer that fails after it has started
jest.mock('../api/controllers/editHistoryController', () => ({
    getGlobalEditHistory: (req: unknown, res: http.ServerResponse, next: (error?: unknown) => void) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write('{"history": [');
        next(new Error(`History failed for ${EMAIL}`));
    }
}));

interface Answer {
    status: number | undefined;
    contentType: string | undefined;
    text: string;
    /** false when the connection was closed before the answer was complete */
    complete: boolean;
}

function request(port: number, address: string, headers: Record<string, string> = {}): Promise<Answer> {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: address, method: 'GET', headers }, response => {
            let text = '';
            response.on('data', chunk => text += chunk);
            // a connection closed part-way is reported as an error on the answer; 'close' follows it
            response.on('error', () => undefined);
            response.on('close', () => resolve({
                status: response.statusCode,
                contentType: response.headers['content-type'],
                text,
                complete: response.complete
            }));
        });
        req.on('error', error => {
            // closed before even the start of the answer arrived
            if((error as NodeJS.ErrnoException).code === 'ECONNRESET') {
                resolve({ status: undefined, contentType: undefined, text: '', complete: false });
            } else {
                reject(error);
            }
        });
        req.end();
    });
}

/** The session cookie a browser sends back, signed the way express-session signs it. */
function sessionCookie(sessionId: string): string {
    const signature = crypto.createHmac('sha256', cookieSecret).update(sessionId).digest('base64').replace(/=+$/, '');
    return `cl.session=${encodeURIComponent(`s:${sessionId}.${signature}`)}`;
}

describe('the server\'s last error handler', () => {
    const originalEnv = { ...process.env };

    let server: http.Server;
    let port: number;
    let logged: jest.SpyInstance[];
    let App: jest.Mock;
    let sessionQuery: jest.Mock;

    function loggedText(): string {
        // util.format prints an error's message and stack, which JSON.stringify would drop
        return logged.flatMap(spy => spy.mock.calls).map(call => format(...call)).join('\n');
    }

    beforeAll(async () => {
        process.env.RAZZLE_PUBLIC_DIR = path.resolve(__dirname, '../../public');
        process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
        process.env.APP_COOKIE_SECRET = cookieSecret;

        App = (await import('../frontend/app')).App as unknown as jest.Mock;
        sessionQuery = (await import('../db')).default.query as unknown as jest.Mock;
        // the session store clears out old sessions when it starts
        sessionQuery.mockResolvedValue([]);

        // loaded here, not imported at the top, because the server reads its settings when it is loaded
        const app = (await import('../server')).default;
        await new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        port = (server.address() as AddressInfo).port;
    });

    afterAll(() => {
        process.env = originalEnv;
        return new Promise(resolve => server.close(resolve));
    });

    beforeEach(() => {
        App.mockReset();
        App.mockImplementation(() => null);
        sessionQuery.mockReset();
        sessionQuery.mockResolvedValue([]);
        logged = (['log', 'info', 'warn', 'error', 'debug'] as const)
            .map(level => jest.spyOn(console, level).mockImplementation(() => undefined));
    });

    afterEach(() => {
        logged.forEach(spy => spy.mockRestore());
    });

    test('an error thrown while rendering a page gets a plain 500 and is logged without its message', async () => {
        App.mockImplementation(() => {
            throw new Error(`Could not render the page for ${EMAIL}`);
        });

        const answer = await request(port, '/view/categories');

        expect(answer.status).toBe(500);
        expect(answer.contentType).toMatch(/^text\/plain/);
        expect(answer.text).toBe('Internal Server Error');
        expect(App).toHaveBeenCalled();

        expect(loggedText()).toContain(SERVER_HANDLER);
        expect(loggedText()).not.toContain(EMAIL);
    });

    test('a session the store cannot read gets a plain 500 and is logged without the session id', async () => {
        sessionQuery.mockImplementation((query: string, values: unknown[]) => Promise.reject(refusedQueryError(
            'canceling statement due to statement timeout', { code: '57014' }, query, values
        )));

        const answer = await request(port, '/view/categories', { Cookie: sessionCookie(SESSION_ID) });

        // the store was asked for that session, and its error carried the session id
        expect(format(sessionQuery.mock.calls)).toContain(SESSION_ID);
        expect(answer.status).toBe(500);
        expect(answer.text).toBe('Internal Server Error');

        expect(loggedText()).toContain(SERVER_HANDLER);
        expect(loggedText()).toContain('57014');
        expect(loggedText()).not.toContain(SESSION_ID);
    });

    test('an answer that fails after it has started is cut off, and logged without its message', async () => {
        const answer = await request(port, '/tiles/started-then-failed.png');

        // whether the start of the answer arrived before the connection closed depends on timing
        expect(answer.complete).toBe(false);
        expect(answer.text).not.toContain(EMAIL);

        expect(loggedText()).toContain(SERVER_HANDLER);
        expect(loggedText()).not.toContain(EMAIL);
    });

    test('an API answer that fails after it has started is cut off by the API\'s own handler', async () => {
        const answer = await request(port, '/api/history');

        expect(answer.complete).toBe(false);
        expect(answer.text).not.toContain(EMAIL);

        expect(loggedText()).toContain(API_HANDLER);
        expect(loggedText()).not.toContain(SERVER_HANDLER);
        expect(loggedText()).not.toContain(EMAIL);
    });

    test('an error made for a bad request keeps its 4xx status', async () => {
        const answer = await request(port, '/tiles/bad-request.png');

        expect(answer.status).toBe(400);
        expect(answer.text).toBe('Bad Request');
        expect(loggedText()).toContain(SERVER_HANDLER);
        expect(loggedText()).not.toContain(EMAIL);
    });

    test('a page that renders is answered as before', async () => {
        const answer = await request(port, '/view/categories');

        expect(answer.status).toBe(200);
        expect(answer.complete).toBe(true);
        expect(answer.text).toContain('<div id="root">');
        expect(loggedText()).toBe('');
    });
});
