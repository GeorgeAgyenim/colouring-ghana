/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/query-engine/issues/18-connect-colouring-ghana-to-engine.md
 * Tests FR-1.4, FR-14.1 (spec user story 77); see ADR-0019, ADR-0017, ADR-0011.
 *
 * The app's route /api/query/* forwards to the query engine, a separate service, only while
 * Analyse mode is on: on outside production unless switched off, off in production unless
 * switched on. The real server (src/server.tsx) is used, over HTTP on a local port, in front of
 * a stand-in engine that records what reaches it. The database is replaced.
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { format } from 'util';

import { queryEngineProxy } from '../api/queryEngineProxy';

const assetsManifest = '/test-assets-manifest.json';

jest.mock('/test-assets-manifest.json', () => ({ client: { js: '/static/js/client.js' } }), { virtual: true });

jest.mock('../db', () => ({
    __esModule: true,
    default: {
        // the session store clears out old sessions when it starts
        query: () => Promise.resolve([]),
        oneOrNone: () => Promise.resolve({ max: '1' })
    }
}));

jest.mock('../api/dataAccess/transaction', () => ({
    startUpdateTransaction: () => {
        throw new Error('This test must not reach the database');
    }
}));

jest.mock('../frontend/app', () => ({
    App: () => null
}));

// the tile server and the tile cache need a tile cache folder to load, and these tests ask them for nothing
jest.mock('../tiles/tileserver', () => ({
    __esModule: true,
    default: (req: unknown, res: unknown, next: () => void) => next()
}));
jest.mock('../tiles/rendererDefinition', () => ({ tileCache: {} }));

interface Received {
    method: string | undefined;
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
    body: string;
}

interface Answer {
    status: number | undefined;
    headers: http.IncomingHttpHeaders;
    text: string;
}

/** A stand-in for the engine: records each request and answers as the test says. */
class FakeEngine {
    received: Received[] = [];
    answer: (req: http.IncomingMessage, res: http.ServerResponse) => void = FakeEngine.healthy;

    static healthy(req: http.IncomingMessage, res: http.ServerResponse): void {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end('{"status":"ok"}');
    }
    private server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            this.received.push({ method: req.method, url: req.url, headers: req.headers, body });
            this.answer(req, res);
        });
    });

    /** Starts listening, and resolves to the engine's address. */
    start(host = '127.0.0.1'): Promise<string> {
        return new Promise(resolve => this.server.listen(0, host, () => {
            const address = host.includes(':') ? `[${host}]` : host;
            resolve(`http://${address}:${(this.server.address() as AddressInfo).port}`);
        }));
    }

    stop(): Promise<void> {
        return new Promise(resolve => this.server.close(() => resolve()));
    }
}

function request(port: number, method: string, address: string, headers: Record<string, string> = {}, body?: string): Promise<Answer> {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: address, method, headers, agent: false }, response => {
            let text = '';
            response.on('data', chunk => text += chunk);
            response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text }));
        });
        req.on('error', reject);
        req.end(body);
    });
}

/** The app's server, loaded afresh with these settings, because it reads them when it is loaded. */
async function startApp(settings: Record<string, string | undefined>): Promise<http.Server> {
    process.env.RAZZLE_PUBLIC_DIR = path.resolve(__dirname, '../../public');
    process.env.RAZZLE_ASSETS_MANIFEST = assetsManifest;
    process.env.APP_COOKIE_SECRET = 'not-a-real-secret';
    for (const [name, value] of Object.entries(settings)) {
        if (value === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = value;
        }
    }
    jest.resetModules();
    const app = (await import('../server')).default;
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    return server;
}

function portOf(server: http.Server): number {
    return (server.address() as AddressInfo).port;
}

/** Captures what the code writes to the console instead of printing it, so a test can read it. */
function captureConsole(): { text: () => string, restore: () => void } {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const)
        .map(level => jest.spyOn(console, level).mockImplementation(() => undefined));
    return {
        // util.format prints an error as the console would
        text: () => spies.flatMap(spy => spy.mock.calls).map(call => format(...call)).join('\n'),
        restore: () => spies.forEach(spy => spy.mockRestore())
    };
}

describe('the query engine route /api/query/*', () => {
    const originalEnv = { ...process.env };
    const engine = new FakeEngine();
    let engineUrl: string;
    let app: http.Server | undefined;
    let logged: ReturnType<typeof captureConsole>;

    function loggedText(): string {
        return logged.text();
    }

    beforeAll(async () => {
        engineUrl = await engine.start();
    });

    afterAll(() => engine.stop());

    beforeEach(() => {
        engine.received = [];
        engine.answer = FakeEngine.healthy;
        logged = captureConsole();
    });

    afterEach(async () => {
        logged.restore();
        process.env = { ...originalEnv };
        if (app !== undefined) {
            await new Promise(resolve => app?.close(resolve));
            app = undefined;
        }
    });

    test('outside production, with no setting, it forwards to the engine without the /api/query prefix', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: engineUrl });

        const answer = await request(portOf(app), 'GET', '/api/query/health');

        expect(answer.status).toBe(200);
        expect(answer.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(answer.text).toBe('{"status":"ok"}');
        expect(engine.received.map(r => `${r.method} ${r.url}`)).toEqual(['GET /health']);
    });

    test('a plan is sent to the engine as it was posted, and the engine\'s answer comes back as it was given', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: engineUrl });
        const plan = '{"plan": {"version": "1.0.0", "area": {"type": "viewport", "bbox": [0, 0, 1, 1]}, "steps": [], "outputs": []}}';
        const invalid = '{"status":"invalid","errors":[{"message":"A plan needs at least one output.","step":null,"field":null,"path":"/outputs"}]}';
        engine.answer = (req, res) => {
            res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(invalid);
        };

        const logBefore = loggedText();

        const answer = await request(portOf(app), 'POST', '/api/query/v1/run?lang=en',
            { 'Content-Type': 'application/json', 'Accept': 'application/json' }, plan);

        expect(engine.received).toHaveLength(1);
        expect(engine.received[0].method).toBe('POST');
        expect(engine.received[0].url).toBe('/v1/run?lang=en');
        expect(engine.received[0].headers['content-type']).toBe('application/json');
        expect(engine.received[0].headers['accept']).toBe('application/json');
        expect(engine.received[0].body).toBe(plan);

        expect(answer.status).toBe(422);
        expect(answer.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(answer.text).toBe(invalid);
        // the request and its answer added nothing to the log
        expect(loggedText()).toBe(logBefore);
    });

    test('the engine\'s answer headers come back, except a cookie, which the engine has no business setting', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: engineUrl });
        engine.answer = (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="result.zip"',
                'Set-Cookie': 'tracker=1'
            });
            res.end('PK');
        };

        const answer = await request(portOf(app), 'POST', '/api/query/v1/download', { 'Content-Type': 'application/json' }, '{}');

        expect(answer.status).toBe(200);
        expect(answer.headers['content-type']).toBe('application/zip');
        expect(answer.headers['content-disposition']).toBe('attachment; filename="result.zip"');
        expect(answer.headers['set-cookie']).toBeUndefined();
        expect(answer.text).toBe('PK');
    });

    test('the person\'s cookies, credentials, address and browser are not sent to the engine', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: engineUrl });

        await request(portOf(app), 'GET', '/api/query/v1/catalogue', {
            'Cookie': 'cl.session=s%3Aabc.def',
            'Authorization': 'Bearer not-a-real-token',
            'X-Forwarded-For': '154.160.1.2',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14)',
            'Referer': 'https://colouringghana.example/view/categories'
        });

        const sent = engine.received[0].headers;
        expect(Object.keys(sent).sort()).toEqual(['connection', 'host']);
    });

    test('in production, with no setting, the route does not exist and nothing reaches the engine', async () => {
        app = await startApp({ NODE_ENV: 'production', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: engineUrl });

        const answer = await request(portOf(app), 'GET', '/api/query/health');

        expect(answer.status).toBe(404);
        expect(JSON.parse(answer.text)).toEqual({ error: 'Resource not found' });
        expect(engine.received).toEqual([]);
    });

    test('ANALYSE_MODE=off removes the route outside production', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: 'off', ANALYSE_ENGINE_URL: engineUrl });

        const answer = await request(portOf(app), 'GET', '/api/query/health');

        expect(answer.status).toBe(404);
        expect(engine.received).toEqual([]);
    });

    test('ANALYSE_MODE=on adds the route in production', async () => {
        app = await startApp({ NODE_ENV: 'production', ANALYSE_MODE: 'on', ANALYSE_ENGINE_URL: engineUrl });

        const answer = await request(portOf(app), 'GET', '/api/query/health');

        expect(answer.status).toBe(200);
        expect(engine.received.map(r => r.url)).toEqual(['/health']);
    });

    test('the server refuses to start when ANALYSE_MODE is neither on nor off', async () => {
        await expect(startApp({ NODE_ENV: 'production', ANALYSE_MODE: 'true', ANALYSE_ENGINE_URL: engineUrl }))
            .rejects.toThrow('ANALYSE_MODE must be "on" or "off", or not set');
    });

    test('when the engine cannot be reached, the answer says so and the log holds nothing that was sent', async () => {
        // a port nothing listens on: the stand-in engine's, after it has stopped
        const stopped = new FakeEngine();
        const stoppedUrl = await stopped.start();
        await stopped.stop();
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: stoppedUrl });
        const plan = '{"plan": {"area": {"type": "viewport", "bbox": [-1.5713, 6.6745, -1.5612, 6.6838]}}}';

        const answer = await request(portOf(app), 'POST', '/api/query/v1/run', { 'Content-Type': 'application/json' }, plan);

        expect(answer.status).toBe(502);
        expect(answer.headers['content-type']).toMatch(/^application\/json/);
        expect(JSON.parse(answer.text)).toEqual({ error: 'The query engine is not answering. Try again later.' });
        expect(loggedText()).toContain('ECONNREFUSED');
        expect(loggedText()).not.toContain('6.6745');
        expect(loggedText()).not.toContain(stoppedUrl.replace('http://', ''));
    });

    test('when the engine\'s address is not set, the route answers that the engine is not set up', async () => {
        app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: undefined });

        const answer = await request(portOf(app), 'GET', '/api/query/health');

        expect(answer.status).toBe(503);
        expect(JSON.parse(answer.text)).toEqual({ error: 'The query engine is not set up on this server.' });
        // said once, when the server starts
        expect(loggedText()).toContain('ANALYSE_ENGINE_URL is not set');
    });

    test('an engine at an IPv6 address is reached', async () => {
        const ipv6Engine = new FakeEngine();
        const ipv6Url = await ipv6Engine.start('::1');
        try {
            app = await startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: ipv6Url });

            const answer = await request(portOf(app), 'GET', '/api/query/health');

            expect(answer.status).toBe(200);
            expect(ipv6Engine.received.map(r => r.url)).toEqual(['/health']);
        } finally {
            await ipv6Engine.stop();
        }
    });

    test('the server refuses to start when ANALYSE_ENGINE_URL is not an http address', async () => {
        await expect(startApp({ NODE_ENV: 'development', ANALYSE_MODE: undefined, ANALYSE_ENGINE_URL: '127.0.0.1:3100' }))
            .rejects.toThrow('ANALYSE_ENGINE_URL must be an http:// address, such as http://127.0.0.1:3100');
    });
});

describe('the query engine route, when the engine is slow or fails part-way', () => {
    const engine = new FakeEngine();
    let app: http.Server;
    let logged: ReturnType<typeof captureConsole>;

    beforeAll(async () => {
        const engineUrl = await engine.start();
        const server = express();
        server.use('/api/query', queryEngineProxy(engineUrl, { timeoutMs: 200 }));
        // with the usual time limit, so that only the browser giving up can close the engine's request
        server.use('/usual-limit/api/query', queryEngineProxy(engineUrl));
        app = http.createServer(server);
        await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
    });

    afterAll(async () => {
        await new Promise(resolve => app.close(resolve));
        await engine.stop();
    });

    beforeEach(() => {
        engine.received = [];
        logged = captureConsole();
    });

    afterEach(() => logged.restore());

    test('an engine that has not answered within the time limit gets a 504, and its request is closed', async () => {
        let engineRequestClosed: Promise<void> = Promise.resolve();
        engine.answer = req => {
            // never answers
            engineRequestClosed = new Promise(resolve => req.socket.on('close', () => resolve()));
        };

        const answer = await request(portOf(app), 'GET', '/api/query/v1/catalogue');

        expect(answer.status).toBe(504);
        expect(JSON.parse(answer.text)).toEqual({ error: 'The query engine took too long to answer. Try again later.' });
        await expect(engineRequestClosed).resolves.toBeUndefined();
    });

    test('an answer the engine cuts off part-way is cut off for the browser too', async () => {
        engine.answer = (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': '100' });
            res.write('{"status":"answer",');
            setTimeout(() => res.destroy(), 20);
        };

        const answer = await new Promise<{ status?: number, complete: boolean }>((resolve, reject) => {
            http.get({ host: '127.0.0.1', port: portOf(app), path: '/api/query/v1/run', agent: false }, response => {
                response.resume();
                response.on('error', () => undefined);
                response.on('close', () => resolve({ status: response.statusCode, complete: response.complete }));
            }).on('error', reject);
        });

        expect(answer.status).toBe(200);
        expect(answer.complete).toBe(false);
    });

    test('when the browser gives up, the request to the engine is closed, and nothing is logged as an engine failure', async () => {
        let engineRequestClosed: Promise<void> | undefined;
        let engineReached: () => void = () => undefined;
        const reached = new Promise<void>(resolve => engineReached = resolve);
        engine.answer = req => {
            engineRequestClosed = new Promise(resolve => req.socket.on('close', () => resolve()));
            engineReached();
        };

        const browser = http.get({ host: '127.0.0.1', port: portOf(app), path: '/usual-limit/api/query/v1/catalogue', agent: false });
        browser.on('error', () => undefined);
        await reached;
        browser.destroy();

        await expect(engineRequestClosed).resolves.toBeUndefined();
        // give the closed request's events time to arrive
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(logged.text()).toBe('');
    });
});
