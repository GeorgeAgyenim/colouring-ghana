/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 *
 * parseJsonOrDefault reads text that comes from a person (the values being pasted onto buildings, taken
 * from the page's address) and runs on the server when it builds the page. Text that is not valid JSON
 * must not be copied into the log.
 */
import { parseJsonOrDefault } from '../helpers';

describe('parseJsonOrDefault()', () => {
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it('returns the value for valid JSON and logs nothing', () => {
        expect(parseJsonOrDefault('{"date_year": 1990}')).toEqual({ date_year: 1990 });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('returns null for text that is not JSON and logs that it happened, without the text', () => {
        expect(parseJsonOrDefault('Kumapley house, GA-183-9385')).toBeNull();

        expect(consoleError).toHaveBeenCalledTimes(1);
        // an error object is inspected by the console, message included, so none is passed
        consoleError.mock.calls[0].forEach(argument => expect(typeof argument).toBe('string'));
        expect(consoleError.mock.calls[0].join(' ')).not.toMatch(/Kumapley|GA-183|Unexpected/);
    });
});
