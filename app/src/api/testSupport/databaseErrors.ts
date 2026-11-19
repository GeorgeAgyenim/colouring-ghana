/*
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 *
 * Test support: database errors shaped like the real ones, made without a database.
 * Used by tests only. It is not under __tests__ because jest runs every file there as a test.
 * The shapes were read from the installed libraries:
 * - pg-protocol (dist/parser.js, parseErrorMessage) makes a DatabaseError named 'error' and sets
 *   severity, code, detail, where, table, constraint and more on it;
 * - pg-promise (lib/query.js) then adds `query` to it: the SQL with the values already written
 *   into it, because this project does not use the pgFormatting option;
 * - pg-promise (lib/errors/query-result-error.js) makes a QueryResultError, again holding `query`,
 *   when a query that must return one row returns none.
 */
import pgPromise from 'pg-promise';

const pgp = pgPromise();

// the DatabaseError class of pg-protocol, reached the way pg-promise exposes the driver
const PgDatabaseError = (pgp.pg as unknown as {
    DatabaseError: new (message: string, length: number, name: string) => Error & Record<string, unknown>
}).DatabaseError;

// pg-promise's types do not declare the constructor of its QueryResultError
const QueryResultError = pgp.errors.QueryResultError as unknown as
    new (code: number, result: { rows: unknown[] }, query: string, values: unknown) => Error;

/** The query as pg-promise attaches it to an error: with the values written into the SQL. */
export function formatQuery(query: string, values?: unknown[]): string {
    return pgp.as.format(query, values);
}

/**
 * The error of a query the database refused.
 * @param message the database's own message, e.g. 'duplicate key value violates unique constraint "x"'
 * @param fields the other fields the database sends (code, detail, constraint, table, where...)
 */
export function refusedQueryError(
    message: string,
    fields: Record<string, string>,
    query: string,
    values?: unknown[]
): Error {
    const error = new PgDatabaseError(message, 200, 'error');
    Object.assign(error, { severity: 'ERROR' }, fields);
    error.query = formatQuery(query, values);
    error.params = undefined;
    return error;
}

/** The error of a query that had to return one row and returned none. */
export function noRowsError(query: string, values?: unknown[]): Error {
    return new QueryResultError(
        pgp.errors.queryResultErrorCode.noData,
        { rows: [] },
        formatQuery(query, values),
        undefined
    );
}
