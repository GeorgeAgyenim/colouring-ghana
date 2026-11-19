/**
 * @jest-environment node
 */
/*
 * Tickets: docs/tickets/location-search/issues/15-api-answers-send-raw-errors.md
 *          docs/tickets/location-search/issues/17-small-error-and-page-fixes.md
 *
 * What the API answers when something fails. The answer is a plain `error` text that the
 * page can show. It is never the error itself: an error from the database connection carries
 * the failed query with the values written into it (a username and password, an email, a
 * user id, an API key, a session id). Refusals the person can act on keep their messages.
 *
 * The real API router is used, over HTTP on a local port, with the real controllers and
 * services. Only the database connection (src/db.ts) is replaced; failures are errors shaped
 * like the real ones (see ../testSupport/databaseErrors.ts).
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { format } from 'util';

import db from '../../db';
import apiRouter from '../api';

import { refusedQueryError } from '../testSupport/databaseErrors';

jest.mock('../../db', () => {
    const pgPromise = jest.requireActual('pg-promise');
    return {
        __esModule: true,
        default: {
            // the real pg-promise helpers, which build SQL text and need no connection
            $config: { pgp: pgPromise() },
            one: jest.fn(),
            none: jest.fn(),
            oneOrNone: jest.fn(),
            manyOrNone: jest.fn()
        }
    };
});

const QUERY_METHODS = ['one', 'none', 'oneOrNone', 'manyOrNone'] as const;
const database = db as unknown as Record<typeof QUERY_METHODS[number], jest.Mock>;

const USER_ID = '6f1d2c3b-58a7-4e9f-b1a2-0c9d8e7f6a5b';
const USERNAME = 'kwame_mensah';
const EMAIL = 'kwame@example.org';
const PASSWORD = 'correct-horse-battery';
const SESSION_ID = 'Zk3vQ8sT1nXw5pLr';

/** Words that appear only in a query or in an error object, never in a plain answer. */
const PARTS_OF_A_RAW_ERROR = ['SELECT', 'UPDATE', 'INSERT', 'DELETE', 'users', 'severity', 'query', 'stack'];

describe('What the API answers when something fails', () => {
    let server: http.Server;
    let signedInUserId: string | undefined;
    let endSession: (done: (error?: Error) => void) => void;
    let sessionEnded: boolean;

    /** The answer as the browser receives it: the status and the raw text. */
    function send(method: string, path: string, body?: Record<string, unknown>): Promise<{ status: number; text: string }> {
        const port = (server.address() as AddressInfo).port;
        return new Promise((resolve, reject) => {
            const request = http.request(
                { host: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } },
                response => {
                    let text = '';
                    response.on('data', chunk => text += chunk);
                    response.on('end', () => resolve({ status: response.statusCode, text }));
                }
            );
            request.on('error', reject);
            request.end(body == undefined ? undefined : JSON.stringify(body));
        });
    }

    /** Everything written to the log, as text, the way the console writes it. */
    function logged(): string {
        return [console.log, console.error, console.warn, console.info, console.debug]
            .flatMap(method => (method as jest.Mock).mock.calls)
            .map(call => format(...call))
            .join('\n');
    }

    /** The database refuses the query, as pg-promise reports it: with the query and its values. */
    function refuse(message: string, fields: Record<string, string>) {
        return (query: string, values?: unknown[]) => Promise.reject(refusedQueryError(message, fields, query, values));
    }

    /** The answer is a plain error text, and holds nothing of the error or of the person. */
    function expectPlainErrorAnswer(text: string, error: string) {
        expect(JSON.parse(text)).toEqual({ error });
        for(const value of [USER_ID, USERNAME, EMAIL, PASSWORD, SESSION_ID, ...PARTS_OF_A_RAW_ERROR]) {
            expect(text).not.toContain(value);
        }
    }

    beforeAll(() => {
        const app = express();
        // stand in for the session middleware of server.tsx
        app.use((req, res, next) => {
            req.session = {
                user_id: signedInUserId,
                destroy: done => endSession(error => {
                    sessionEnded = error == undefined;
                    done(error);
                })
            } as typeof req.session;
            next();
        });
        app.use('/api', apiRouter);
        return new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
    });

    afterAll(() => new Promise(resolve => server.close(resolve)));

    beforeEach(() => {
        signedInUserId = USER_ID;
        sessionEnded = false;
        endSession = done => done();

        for(const method of QUERY_METHODS) {
            database[method].mockReset();
            // a query the test did not prepare an answer for is a mistake in the test
            database[method].mockImplementation(() => Promise.reject(new Error('The test did not expect this query')));
        }

        for(const level of ['log', 'error', 'warn', 'info', 'debug'] as const) {
            jest.spyOn(console, level).mockImplementation(() => undefined);
        }
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('when the database fails', () => {
        const timeout = refuse('canceling statement due to statement timeout', { code: '57014' });

        it('logging in answers "Database error", without the username, the password or the query', async () => {
            signedInUserId = undefined;
            database.oneOrNone.mockImplementation(timeout);

            const response = await send('POST', '/api/login', { username: USERNAME, password: PASSWORD });

            expectPlainErrorAnswer(response.text, 'Database error');
            expect(response.status).toBe(500);
            // the error the database connection raised did carry both
            const raised = format(await database.oneOrNone.mock.results[0].value.catch((error: unknown) => error));
            expect(raised).toContain(USERNAME);
            expect(raised).toContain(PASSWORD);
            // the failure is logged, without them
            expect(logged()).toContain('logging in');
            expect(logged()).toContain('57014');
            expect(logged()).not.toContain(USERNAME);
            expect(logged()).not.toContain(PASSWORD);
        });

        it('asking for a new API key answers an error text, without the user id or the query', async () => {
            database.one.mockImplementation(timeout);

            const response = await send('POST', '/api/api/key');

            expectPlainErrorAnswer(response.text, 'Failed to generate new API key.');
            expect(format(database.one.mock.calls)).toContain(USER_ID);
            expect(logged()).not.toContain(USER_ID);
        });

        it('creating an account answers "Database error", without the username, email, password or query', async () => {
            signedInUserId = undefined;
            database.one.mockImplementation(timeout);

            const response = await send('POST', '/api/users', {
                username: USERNAME,
                email: EMAIL,
                confirm_email: EMAIL,
                password: PASSWORD
            });

            expectPlainErrorAnswer(response.text, 'Database error');
            expect(format(database.one.mock.calls)).toContain(EMAIL);
        });

        it('reading the signed-in account answers "Database error", without the user id or the query', async () => {
            database.one.mockImplementation(timeout);

            const response = await send('GET', '/api/users/me');

            expectPlainErrorAnswer(response.text, 'Database error');
            expect(response.status).toBe(500);
            expect(format(database.one.mock.calls)).toContain(USER_ID);
            expect(logged()).toContain('57014');
            expect(logged()).not.toContain(USER_ID);
        });

        it('deleting the account answers "Database error" and does not sign the person out', async () => {
            database.none.mockImplementation(timeout);

            const response = await send('DELETE', '/api/users/me');

            expectPlainErrorAnswer(response.text, 'Database error');
            expect(response.status).toBe(500);
            // the account was not deleted, so the person is still signed in to it
            expect(sessionEnded).toBe(false);
            expect(format(database.none.mock.calls)).toContain(USER_ID);
            expect(logged()).toContain('57014');
            expect(logged()).not.toContain(USER_ID);
        });

        it('deleting the account when the session cannot be ended answers an error text, without the session id', async () => {
            database.none.mockResolvedValue(null);
            endSession = done => done(refusedQueryError(
                'permission denied for table user_sessions',
                { code: '42501' },
                'DELETE FROM user_sessions WHERE sid = $1',
                [SESSION_ID]
            ));

            const response = await send('DELETE', '/api/users/me');

            expectPlainErrorAnswer(response.text, 'Server error');
            expect(response.status).toBe(500);
            expect(logged()).toContain('delete user');
            expect(logged()).toContain('42501');
            expect(logged()).not.toContain(SESSION_ID);
        });
    });

    describe('when something other than the database fails', () => {

        it('a location search whose results cannot be read answers an error text', async () => {
            database.manyOrNone.mockResolvedValue([
                { search_id: 1, search_str: 'Nkrumah Circle', search_class: 'place', st_asgeojson: 'not a geometry', zoom: 9 }
            ]);

            const response = await send('GET', '/api/search?q=Nkrumah%20Circle');

            expectPlainErrorAnswer(response.text, 'Server error');
            expect(response.status).toBe(500);
            expect(logged()).toContain('location search');
            expect(logged()).not.toContain('Nkrumah');
        });
    });

    describe('when the request is refused, the person still gets the message they get today', () => {

        it('a wrong password at log-in', async () => {
            signedInUserId = undefined;
            database.oneOrNone.mockResolvedValue({ user_id: USER_ID, auth_ok: false, is_blocked: false });

            const response = await send('POST', '/api/login', { username: USERNAME, password: PASSWORD });

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ error: 'Username / password pair not recognised' });
        });

        it('a username that does not exist at log-in', async () => {
            signedInUserId = undefined;
            database.oneOrNone.mockResolvedValue(null);

            const response = await send('POST', '/api/login', { username: USERNAME, password: PASSWORD });

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ error: 'The username does not exist in the system' });
        });

        it('a password too short when creating an account, which is not logged', async () => {
            signedInUserId = undefined;

            const response = await send('POST', '/api/users', { username: USERNAME, password: 'short' });

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ error: 'Password must be at least 8 characters long' });
            expect(database.one).not.toHaveBeenCalled();
            expect(logged()).toBe('');
        });

        it('reading the account when not signed in', async () => {
            signedInUserId = undefined;

            const response = await send('GET', '/api/users/me');

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ error: 'Must be logged in' });
        });
    });

    // Only an API client can send these (the forms send text); each is a refusal the caller can act on.
    // Issue 15 answered a username that is not text with "Server error"; issue 17 makes it a refusal.
    describe('when a username or password is missing or not text, the request is refused', () => {

        describe.each([
            ['username', { password: PASSWORD }, 'Username'],
            ['password', { username: USERNAME }, 'Password']
        ])('a %s that is missing or not text when creating an account', (field, otherFields, title) => {
            it.each([
                ['a number', 12345678, `${title} must be text`],
                ['an object', { text: 'kwame' }, `${title} must be text`],
                ['missing', undefined, `${title} is required`]
            ])('%s is refused with a message, not "Server error", and is not logged', async (kind, value, message) => {
                signedInUserId = undefined;

                const response = await send('POST', '/api/users', { ...otherFields, [field]: value });

                expect(response.status).toBe(200);
                expect(JSON.parse(response.text)).toEqual({ error: message });
                expect(database.one).not.toHaveBeenCalled();
                expect(logged()).toBe('');
            });
        });

        // The database would fail on a number (`username = 12345678` compares text with a number), which
        // was answered "Database error"; a log-in that cannot match an account is refused as a wrong one is.
        it.each([
            ['a username that is a number', { username: 12345678, password: PASSWORD }],
            ['a username that is an object', { username: { text: USERNAME }, password: PASSWORD }],
            ['a missing username', { password: PASSWORD }],
            ['a password that is a number', { username: USERNAME, password: 12345678 }],
            ['a password that is an object', { username: USERNAME, password: { text: PASSWORD } }],
            ['a missing password', { username: USERNAME }]
        ])('%s at log-in is refused as a wrong password is, without asking the database', async (kind, body) => {
            signedInUserId = undefined;

            const response = await send('POST', '/api/login', body);

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ error: 'Username / password pair not recognised' });
            expect(database.oneOrNone).not.toHaveBeenCalled();
            expect(logged()).not.toContain(USERNAME);
            expect(logged()).not.toContain(PASSWORD);
        });
    });

    describe('when everything works, the answers are unchanged', () => {

        it('logging in', async () => {
            signedInUserId = undefined;
            database.oneOrNone.mockResolvedValue({ user_id: USER_ID, auth_ok: true, is_blocked: false });

            const response = await send('POST', '/api/login', { username: USERNAME, password: PASSWORD });

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ user_id: USER_ID });
        });

        it('reading the signed-in account', async () => {
            const account = { username: USERNAME, email: EMAIL, registered: '2026-11-19T10:00:00.000Z', api_key: null };
            database.one.mockResolvedValue(account);

            const response = await send('GET', '/api/users/me');

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual(account);
        });

        it('deleting the account signs the person out', async () => {
            database.none.mockResolvedValue(null);

            const response = await send('DELETE', '/api/users/me');

            expect(response.status).toBe(200);
            expect(JSON.parse(response.text)).toEqual({ success: true });
            expect(sessionEnded).toBe(true);
        });
    });
});
