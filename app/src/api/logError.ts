/*
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 *
 * Writes an error to the server log without what a person sent or who they are.
 *
 * An error from the database connection carries the failed query with its values written
 * into it (`query`), and the database's own texts (`message`, `detail`, `where`) can repeat
 * a value. An error from reading a request carries the request body. So an error is never
 * logged whole. Only these parts are logged, and nothing else:
 *
 * - the words the caller gives to say what failed;
 * - the error's name;
 * - its code, constraint and table (present on a database error), when each is a short
 *   identifier;
 * - its message, only when it is one of our own error classes (UserError, ApiUserError and
 *   the classes that extend them). We write those messages ourselves: never put a value a
 *   person sent, or anything that identifies a person, into one;
 * - for our own DatabaseError, the error it wraps in `detail`, by the same rules. A `detail`
 *   that is text comes from the database and is not logged;
 * - where in the code the error was raised (the "at ..." lines of its stack, without the
 *   start of the stack, which repeats the message).
 */
import { ApiUserError } from './errors/api';
import { DatabaseError, UserError } from './errors/general';

/**
 * Log an error without logging what a person sent or who they are.
 * @param context words that say what failed, e.g. 'Error creating user:'. Must not hold a
 * value a person sent; a building id is fine.
 * @param error whatever was thrown
 */
export function logErrorSafely(context: string, error: unknown): void {
    console.error(context, [describeError(error), ...raisedAt(error)].join('\n'));
}

function describeError(error: unknown): string {
    if(typeof error !== 'object' || error === null) {
        return `thrown ${error === null ? 'null' : typeof error}`;
    }

    const parts = [identifier(error['name']) ?? 'thrown object'];

    if(error instanceof UserError || error instanceof ApiUserError) {
        parts[0] += `: ${error.message}`;
    }

    for(const field of ['code', 'constraint', 'table']) {
        const value = identifier(error[field]);
        if(value != undefined) {
            parts.push(`${field}=${value}`);
        }
    }

    if(error instanceof DatabaseError && typeof error.detail === 'object') {
        parts.push(`caused by: ${describeError(error.detail)}`);
    }

    return parts.join(' ');
}

/**
 * A number, or a short word made by code (an error name, an error code, a table name).
 * Anything else, such as a sentence, is not returned.
 */
function identifier(value: unknown): string | undefined {
    if(typeof value === 'number') {
        return String(value);
    }
    if(typeof value === 'string' && /^[\w.-]{1,64}$/.test(value)) {
        return value;
    }
    return undefined;
}

/**
 * The "at ..." lines of the error's stack: where in the code it was raised.
 * A stack starts with the error's name and message, so everything up to the end of the
 * message is dropped first; a message of several lines cannot pass for a place in the code.
 */
function raisedAt(error: unknown): string[] {
    const { stack, message } = (error ?? {}) as { stack?: unknown, message?: unknown };
    if(typeof stack !== 'string' || typeof message !== 'string' || !stack.includes(message)) {
        return [];
    }

    return stack
        .slice(stack.indexOf(message) + message.length)
        .split('\n')
        .filter(line => /^\s+at /.test(line));
}
