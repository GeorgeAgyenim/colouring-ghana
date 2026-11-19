/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 *
 * logErrorSafely() writes an error to the server log. The log must never hold what a
 * person sent or who they are, and a database error carries exactly that: the failed
 * query with its values. No database is needed: the errors are made here, shaped like
 * the real ones (see ../testSupport/databaseErrors.ts).
 */
import { format } from 'util';

import { ApiUserError } from '../errors/api';
import { ArgumentError, DatabaseError } from '../errors/general';
import { logErrorSafely } from '../logError';

import { noRowsError, refusedQueryError } from '../testSupport/databaseErrors';

const INSERT_USER = 'INSERT INTO users (username, email, pass) VALUES ($1, $2, crypt($3, gen_salt(\'bf\')))';

function usernameTakenError() {
    return refusedQueryError(
        'duplicate key value violates unique constraint "users_username_key"',
        {
            code: '23505',
            detail: 'Key (username)=(kwame_mensah) already exists.',
            where: 'SQL statement "INSERT ... kwame_mensah"',
            internalQuery: 'SELECT 1 FROM users WHERE username = \'kwame_mensah\'',
            schema: 'public',
            table: 'users',
            constraint: 'users_username_key'
        },
        INSERT_USER,
        ['kwame_mensah', 'kwame@example.org', 'correct-horse-battery']
    );
}

describe('logErrorSafely()', () => {

    /** Everything written to the log, as text, the way the console writes it. */
    function logged(): string {
        return [console.log, console.error, console.warn]
            .flatMap(method => (method as jest.Mock).mock.calls)
            .map(call => format(...call))
            .join('\n');
    }

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('the test error really carries the values, so the checks below mean something', () => {
        const whole = format(usernameTakenError());

        expect(whole).toContain('kwame_mensah');
        expect(whole).toContain('kwame@example.org');
        expect(whole).toContain('correct-horse-battery');
    });

    it('logs the words that say what failed', () => {
        logErrorSafely('Error creating user:', usernameTakenError());

        expect(logged()).toContain('Error creating user:');
    });

    it('logs the code, constraint and table of a database error', () => {
        logErrorSafely('Error creating user:', usernameTakenError());

        expect(logged()).toContain('23505');
        expect(logged()).toContain('users_username_key');
        expect(logged()).toContain('table=users');
    });

    it('does not log the query, its values or the detail text of a database error', () => {
        logErrorSafely('Error creating user:', usernameTakenError());

        expect(logged()).not.toContain('kwame_mensah');
        expect(logged()).not.toContain('kwame@example.org');
        expect(logged()).not.toContain('correct-horse-battery');
        expect(logged()).not.toContain('INSERT INTO');
        expect(logged()).not.toContain('already exists');
    });

    it('does not log the message of a database error, which can repeat a value', () => {
        const apiKey = '3f1c9a52-not-a-real-key';
        const error = refusedQueryError(
            `invalid input syntax for type uuid: "${apiKey}"`,
            { code: '22P02' },
            'SELECT user_id FROM users WHERE api_key = $1',
            [apiKey]
        );

        logErrorSafely('Error authenticating API user:', error);

        expect(logged()).not.toContain(apiKey);
        expect(logged()).toContain('22P02');
    });

    it('does not log the query of a "no rows" error', () => {
        const apiKey = '3f1c9a52-not-a-real-key';

        logErrorSafely(
            'Error authenticating API user:',
            noRowsError('SELECT user_id FROM users WHERE api_key = $1', [apiKey])
        );

        expect(logged()).not.toContain(apiKey);
        expect(logged()).toContain('QueryResultError');
    });

    it('logs the error inside our own DatabaseError the same safe way', () => {
        logErrorSafely('Global error handler:', new DatabaseError(usernameTakenError() as any));

        expect(logged()).toContain('DatabaseError');
        expect(logged()).toContain('23505');
        expect(logged()).toContain('users_username_key');
        expect(logged()).not.toContain('kwame_mensah');
        expect(logged()).not.toContain('correct-horse-battery');
    });

    it('does not log the detail of our own DatabaseError when it is text', () => {
        logErrorSafely(
            'Global error handler:',
            new DatabaseError('Key (building_id, user_id, attribute)=(1, user-77, location_name) already exists.')
        );

        expect(logged()).toContain('DatabaseError');
        expect(logged()).not.toContain('user-77');
        expect(logged()).not.toContain('already exists');
    });

    it('logs the message of our own errors, which we write ourselves', () => {
        logErrorSafely('Failed to get building:', new ArgumentError('Building ID 5 does not exist', 'buildingId'));

        expect(logged()).toContain('ArgumentError');
        expect(logged()).toContain('Building ID 5 does not exist');
    });

    it('does not log the error an API refusal was made from', () => {
        logErrorSafely('Global error handler:', new ApiUserError('No change provided', usernameTakenError()));

        expect(logged()).toContain('No change provided');
        expect(logged()).not.toContain('kwame_mensah');
    });

    it('does not log a request body, or the message that quotes it, from a body that is not valid JSON', () => {
        // shaped like the error body-parser makes: a SyntaxError with the whole body on it
        const error = Object.assign(
            new SyntaxError('Unexpected token \'h\', "hello kwame" is not valid JSON'),
            { status: 400, statusCode: 400, expose: true, type: 'entity.parse.failed', body: 'hello kwame_mensah' }
        );

        logErrorSafely('Global error handler:', error);

        expect(logged()).toContain('SyntaxError');
        expect(logged()).not.toContain('kwame');
    });

    it('logs where an error from elsewhere was raised, but not its message', () => {
        function sendResetEmail() {
            throw new Error('all recipients were rejected: 550 <kwame@example.org>');
        }
        let error: unknown;
        try {
            sendResetEmail();
        } catch(caught) {
            error = caught;
        }

        logErrorSafely('Global error handler:', error);

        expect(logged()).toContain('at sendResetEmail');
        expect(logged()).not.toContain('kwame@example.org');
    });

    it('does not mistake a line of the message for a place in the code', () => {
        const error = new Error('could not use the value\n    at 12 Example Street, Accra');

        logErrorSafely('Global error handler:', error);

        expect(logged()).not.toContain('Example Street');
    });

    it('does not log a code that is not a short code', () => {
        const error = Object.assign(new Error('failed'), { code: 'kwame mensah typed this' });

        logErrorSafely('Global error handler:', error);

        expect(logged()).not.toContain('kwame');
    });

    it.each([
        ['an object', { error: 'kwame_mensah is taken' }],
        ['text', 'kwame_mensah is taken'],
        ['nothing', undefined],
    ])('logs only the kind of a thrown value that is not an error: %s', (_description: string, thrown: unknown) => {
        logErrorSafely('Failed to create user:', thrown);

        expect(logged()).toContain('Failed to create user:');
        expect(logged()).not.toContain('kwame_mensah');
    });
});
