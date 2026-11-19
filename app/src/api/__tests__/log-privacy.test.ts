/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 * (the `field` in a refusal's answer: docs/tickets/location-search/issues/08-refused-edit-names-the-field.md)
 *
 * The server log must never hold a person's location, the data they send, or who they
 * are (username, email, password, user id, API key, session id). Building ids may stay.
 *
 * The real API router is used, over HTTP on a local port, with the real controllers,
 * services and data access. Only the database connection (src/db.ts) is replaced: each
 * test says what the database answers, and failures are errors shaped like the real ones
 * (see ../testSupport/databaseErrors.ts), carrying the query with the values a person sent.
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { format } from 'util';

import db from '../../db';
import apiRouter from '../api';

import { noRowsError, refusedQueryError } from '../testSupport/databaseErrors';

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
            manyOrNone: jest.fn(),
            any: jest.fn(),
            tx: jest.fn()
        }
    };
});

// expiring map tiles after an edit works on files and is not part of what is tested here
jest.mock('../services/building/tileCache', () => ({
    expireBuildingTileCache: jest.fn()
}));

const QUERY_METHODS = ['one', 'none', 'oneOrNone', 'manyOrNone', 'any', 'tx'] as const;
const database = db as unknown as Record<typeof QUERY_METHODS[number], jest.Mock>;

const USER_ID = '6f1d2c3b-58a7-4e9f-b1a2-0c9d8e7f6a5b';
const USERNAME = 'kwame_mensah';
const EMAIL = 'kwame@example.org';
const PASSWORD = 'correct-horse-battery';
const API_KEY = '3f1c9a52-7b1e-4c55-9d0e-2a6b8c4d1e0f';
const SESSION_ID = 'Zk3vQ8sT1nXw5pLr';
const PLACE_NAME = 'Auntie Akosua Chop Bar';

describe('What the API writes to the server log', () => {
    let server: http.Server;
    let signedInUserId: string | undefined;
    let endSession: (done: (error?: Error) => void) => void;

    function send(method: string, path: string, body?: string): Promise<{ status: number; body: any }> {
        const port = (server.address() as AddressInfo).port;
        return new Promise((resolve, reject) => {
            const request = http.request(
                { host: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } },
                response => {
                    let text = '';
                    response.on('data', chunk => text += chunk);
                    response.on('end', () => resolve({
                        status: response.statusCode,
                        body: text === '' ? undefined : JSON.parse(text)
                    }));
                }
            );
            request.on('error', reject);
            request.end(body);
        });
    }

    function post(path: string, body: Record<string, unknown>) {
        return send('POST', path, JSON.stringify(body));
    }

    /** Everything written to the log, as text, the way the console writes it. */
    function logged(): string {
        return [console.log, console.error, console.warn]
            .flatMap(method => (method as jest.Mock).mock.calls)
            .map(call => format(...call))
            .join('\n');
    }

    /** The database refuses the query, as pg-promise reports it: with the query and its values. */
    function refuse(message: string, fields: Record<string, string>) {
        return (query: string, values?: unknown[]) => Promise.reject(refusedQueryError(message, fields, query, values));
    }

    beforeAll(() => {
        const app = express();
        // stand in for the session middleware of server.tsx
        app.use((req, res, next) => {
            req.session = { user_id: signedInUserId, destroy: done => endSession(done) } as typeof req.session;
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
        endSession = done => done();

        for(const method of QUERY_METHODS) {
            database[method].mockReset();
            // a query the test did not prepare an answer for is a mistake in the test
            database[method].mockImplementation(() => Promise.reject(new Error('The test did not expect this query')));
        }
        // a transaction runs its work with the same stand-in database
        database.tx.mockImplementation((...args: unknown[]) => {
            const work = args[args.length - 1] as (task: typeof database) => unknown;
            return work(database);
        });

        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('on a normal request', () => {

        it('saving an edit logs neither the value nor the user id', async () => {
            database.one.mockImplementation(async (query: string) => {
                if(/SELECT \* FROM buildings/.test(query)) {
                    return { building_id: 1, geometry_id: 1, revision_id: '4', location_name: null };
                }
                if(/INSERT INTO logs/.test(query)) {
                    return { log_id: '5' };
                }
                if(/UPDATE\s+buildings/.test(query)) {
                    return { building_id: 1, geometry_id: 1, revision_id: '5', location_name: PLACE_NAME };
                }
                throw new Error('The test did not expect this query');
            });
            database.none.mockResolvedValue(null);

            // the body the edit form sends
            const response = await post('/api/buildings/1.json', {
                attributes: { location_name: PLACE_NAME },
                user_attributes: {}
            });

            expect(response.status).toBe(200);
            expect(response.body.attributes).toEqual({ location_name: PLACE_NAME });
            // the edit did reach the (stand-in) database, with the value and the user id
            expect(format(database.one.mock.calls)).toContain(PLACE_NAME);
            expect(format(database.one.mock.calls)).toContain(USER_ID);

            expect(logged()).not.toContain(PLACE_NAME);
            expect(logged()).not.toContain(USER_ID);
        });

        it('verifying a value logs neither the value nor the user id', async () => {
            database.one.mockResolvedValue({ building_id: 1, location_name: PLACE_NAME });
            database.none.mockResolvedValue(null);

            const response = await post('/api/buildings/1/verify.json', { location_name: PLACE_NAME });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ location_name: PLACE_NAME });
            expect(format(database.none.mock.calls)).toContain(PLACE_NAME);
            expect(format(database.none.mock.calls)).toContain(USER_ID);

            expect(logged()).not.toContain(PLACE_NAME);
            expect(logged()).not.toContain(USER_ID);
        });

        it('a failed login is logged as an event, without the username or the password', async () => {
            signedInUserId = undefined;
            database.oneOrNone.mockResolvedValue({ user_id: USER_ID, auth_ok: false, is_blocked: false });

            const response = await post('/api/login', { username: USERNAME, password: PASSWORD });

            expect(response.body).toEqual({ error: 'Username / password pair not recognised' });
            expect(logged()).toContain('Authentication failed');
            expect(logged()).not.toContain(USERNAME);
            expect(logged()).not.toContain(PASSWORD);
            expect(logged()).not.toContain(USER_ID);
        });

        it('deleting an account is logged as an event, without the user id', async () => {
            database.none.mockResolvedValue(null);

            const response = await send('DELETE', '/api/users/me');

            expect(response.body).toEqual({ success: true });
            expect(format(database.none.mock.calls)).toContain(USER_ID);
            expect(logged()).toContain('Deleting user');
            expect(logged()).not.toContain(USER_ID);
        });
    });

    describe('when the database fails', () => {

        it('creating an account logs no username, email or password', async () => {
            signedInUserId = undefined;
            database.one.mockImplementation(refuse(
                'duplicate key value violates unique constraint "users_username_key"',
                {
                    code: '23505',
                    detail: `Key (username)=(${USERNAME}) already exists.`,
                    schema: 'public',
                    table: 'users',
                    constraint: 'users_username_key'
                }
            ));

            const response = await post('/api/users', {
                username: USERNAME,
                email: EMAIL,
                confirm_email: EMAIL,
                password: PASSWORD
            });

            // the answer to the person is unchanged
            expect(response.body).toEqual({ error: 'Username already registered' });

            // the error the database connection raised did carry all three
            const raised = format(await database.one.mock.results[0].value.catch((error: unknown) => error));
            expect(raised).toContain(USERNAME);
            expect(raised).toContain(EMAIL);
            expect(raised).toContain(PASSWORD);

            expect(logged()).not.toContain(USERNAME);
            expect(logged()).not.toContain(EMAIL);
            expect(logged()).not.toContain(PASSWORD);
            // what an operator needs is still there
            expect(logged()).toContain('creating user');
            expect(logged()).toContain('23505');
            expect(logged()).toContain('users_username_key');
        });

        it('creating an account still answers "Database error" when the database gives no detail', async () => {
            signedInUserId = undefined;
            database.one.mockImplementation(refuse('connection terminated unexpectedly', {}));

            const response = await post('/api/users', {
                username: USERNAME,
                email: EMAIL,
                confirm_email: EMAIL,
                password: PASSWORD
            });

            expect(response.body).toEqual({ error: 'Database error' });
            expect(logged()).not.toContain(USERNAME);
            expect(logged()).not.toContain(EMAIL);
            expect(logged()).not.toContain(PASSWORD);
        });

        it('an API key that matches no account is not logged', async () => {
            signedInUserId = undefined;
            database.one.mockImplementation(
                (query: string, values?: unknown[]) => Promise.reject(noRowsError(query, values))
            );

            const response = await send('GET', `/api/buildings/1.json?user_attributes=true&api_key=${API_KEY}`);

            expect(response.body).toEqual({ error: 'Must be logged in' });
            expect(format(database.one.mock.calls)).toContain(API_KEY);
            expect(logged()).not.toContain(API_KEY);
            expect(logged()).toContain('QueryResultError');
        });

        it('an API key the database cannot read is not logged', async () => {
            signedInUserId = undefined;
            const notAKey = 'kwame-mensah-typed-this-as-a-key';
            // the database repeats the value in its message
            database.one.mockImplementation(refuse(`invalid input syntax for type uuid: "${notAKey}"`, { code: '22P02' }));

            const response = await send('GET', `/api/buildings/1.json?user_attributes=true&api_key=${notAKey}`);

            expect(response.body).toEqual({ error: 'Must be logged in' });
            expect(logged()).not.toContain(notAKey);
            expect(logged()).toContain('22P02');
        });

        it('the place clicked on the map is not logged', async () => {
            database.manyOrNone.mockImplementation(refuse('canceling statement due to statement timeout', { code: '57014' }));

            await send('GET', '/api/buildings/locate?lng=-0.186964&lat=5.603717');

            expect(format(database.manyOrNone.mock.calls)).toContain('5.603717');
            expect(logged()).not.toContain('5.603717');
            expect(logged()).not.toContain('0.186964');
            expect(logged()).toContain('57014');
        });

        it('the text searched for is not logged', async () => {
            database.manyOrNone.mockImplementation(refuse('canceling statement due to statement timeout', { code: '57014' }));

            const response = await send('GET', '/api/search?q=Nkrumah%20Circle');

            expect(response.body).toEqual({ error: 'Database error' });
            expect(logged()).not.toContain('Nkrumah');
            expect(logged()).toContain('57014');
        });

        it('the text typed into a suggestion box is not logged by the last-resort error handler', async () => {
            database.manyOrNone.mockImplementation(refuse('canceling statement due to statement timeout', { code: '57014' }));

            const response = await send('GET', '/api/autofill?field_name=location_town&field_value=Kumasi');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Server error' });
            expect(logged()).not.toContain('Kumasi');
            expect(logged()).toContain('Global error handler');
            expect(logged()).toContain('57014');
        });

        it('a session that cannot be ended is logged without the session id', async () => {
            endSession = done => done(refusedQueryError(
                'permission denied for table user_sessions',
                { code: '42501' },
                'DELETE FROM user_sessions WHERE sid = $1',
                [SESSION_ID]
            ));

            const response = await send('POST', '/api/logout');

            expect(response.body).toEqual({ error: 'Failed to end session' });
            expect(logged()).not.toContain(SESSION_ID);
            expect(logged()).toContain('42501');
        });

        it('verifying a value still answers "Database error", and logs neither the value nor the user id', async () => {
            database.one.mockResolvedValue({ building_id: 1, location_name: PLACE_NAME });
            database.none.mockImplementation(refuse(
                'insert or update on table "building_verification" violates foreign key constraint "building_verification_user_id_fkey"',
                {
                    code: '23503',
                    detail: `Key (user_id)=(${USER_ID}) is not present in table "users".`,
                    table: 'building_verification',
                    constraint: 'building_verification_user_id_fkey'
                }
            ));

            const response = await post('/api/buildings/1/verify.json', { location_name: PLACE_NAME });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Database error' });
            expect(logged()).not.toContain(PLACE_NAME);
            expect(logged()).not.toContain(USER_ID);
            expect(logged()).toContain('23503');
            expect(logged()).toContain('building_verification_user_id_fkey');
        });
    });

    describe('when a verification is refused', () => {

        it('a value that does not match the saved one gets a 400 that does not repeat it, and nothing is logged', async () => {
            const savedName = 'Akosua Kitchen';
            database.one.mockResolvedValue({ building_id: 1, location_name: savedName });

            const response = await post('/api/buildings/1/verify.json', { location_name: PLACE_NAME });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'The value sent does not match the saved value, so it was not verified. Reload the building and try again.'
            });
            expect(response.body.error).not.toContain(PLACE_NAME);
            expect(response.body.error).not.toContain(savedName);
            expect(database.none).not.toHaveBeenCalled();
            expect(logged()).toBe('');
        });

        it('an attribute that cannot be verified gets a 400 that does not repeat the value, and nothing is logged', async () => {
            database.one.mockResolvedValue({ building_id: 1, ref_toid: 'osgb1000000000001' });

            const response = await post('/api/buildings/1/verify.json', { ref_toid: 'osgb1000000000001' });

            expect(response.status).toBe(400);
            // `field` names the refused field (issue 08); the value is not repeated
            expect(response.body).toEqual({ error: 'Field cannot be verified', field: 'ref_toid' });
            expect(database.none).not.toHaveBeenCalled();
            expect(logged()).toBe('');
        });

        it('an attribute that does not exist gets the same 400, and nothing is logged', async () => {
            database.one.mockResolvedValue({ building_id: 1 });

            const response = await post('/api/buildings/1/verify.json', { 'where kwame lives': '12 Example Street' });

            expect(response.status).toBe(400);
            // `field` gives back the name this request sent (issue 08), never the value
            expect(response.body).toEqual({ error: 'Field cannot be verified', field: 'where kwame lives' });
            expect(database.none).not.toHaveBeenCalled();
            expect(logged()).toBe('');
        });

        it('verifying the same value twice gets a 400 that says so, and nothing is logged', async () => {
            database.one.mockResolvedValue({ building_id: 1, location_name: PLACE_NAME });
            database.none.mockImplementation(refuse(
                'duplicate key value violates unique constraint "building_verification_pkey"',
                {
                    code: '23505',
                    detail: `Key (building_id, user_id, attribute)=(1, ${USER_ID}, location_name) already exists.`,
                    table: 'building_verification',
                    constraint: 'building_verification_pkey'
                }
            ));

            const response = await post('/api/buildings/1/verify.json', { location_name: PLACE_NAME });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'User already verified that attribute for this building' });
            expect(logged()).toBe('');
        });
    });

    describe('when the request body is not valid JSON', () => {

        it('answers 400 and logs none of the body', async () => {
            signedInUserId = undefined;

            const response = await send('POST', '/api/login', `{"username": "${USERNAME}", "password": "${PASSWORD}`);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Request body is not valid JSON' });
            expect(logged()).toBe('');
        });

        it('answers 400 and logs nothing when the body is not JSON at all', async () => {
            const response = await send('POST', '/api/buildings/1/verify.json', `my house is ${PLACE_NAME}`);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Request body is not valid JSON' });
            expect(logged()).toBe('');
        });
    });
});
