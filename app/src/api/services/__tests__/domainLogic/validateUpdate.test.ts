/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/04-gps-address-server-validation.md
 *
 * The GhanaPost GPS address (location_gps_address) must be checked by the API,
 * not only by the browser. No database is needed: validateFieldChange only reads
 * the field configs.
 */
import { FieldTypeError } from '../../../errors/general';
import { validateFieldChange } from '../../domainLogic/validateUpdate';

function captureError(fn: () => void): unknown {
    try {
        fn();
    } catch(error) {
        return error;
    }
    return undefined;
}

describe('validateFieldChange() for the GhanaPost GPS address', () => {

    beforeEach(() => {
        // validateFieldChange logs every rejection; keep the test output readable
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([
        ['an address with four-digit groups', 'GA-183-9385'],
        ['an address with three-digit groups', 'AK-039-512'],
        ['null, which clears the field', null],
    ])('accepts %s', (_description: string, value: string | null) => {
        expect(() => validateFieldChange('location_gps_address', value)).not.toThrow();
    });

    it.each([
        ['lower-case letters', 'ga-183-9385'],
        ['an address without dashes', 'GA1839385'],
        ['a word that is not an address', 'hello'],
        ['a 20-character string, longer than the database allows', 'GA-183-9385-00000000'],
        ['a valid address inside longer text', 'see GA-183-9385 ok'],
        ['a valid address followed by a line break', 'GA-183-9385\n'],
        ['a valid address after a line break', '\nGA-183-9385'],
        ['an empty string (the field is cleared with null, not "")', ''],
        ['a number', 1839385],
        ['an object', { address: 'GA-183-9385' }],
        ['a list', ['GA-183-9385']],
    ])('rejects %s with the invalid-field error naming the field', (_description: string, value: unknown) => {
        const error = captureError(() => validateFieldChange('location_gps_address', value));

        expect(error).toBeInstanceOf(FieldTypeError);
        expect(error).toHaveProperty('fieldName', 'location_gps_address');
        expect(error).toHaveProperty('message', 'Invalid format of data sent');
    });

    it('does not write the name of a field that does not exist to the server log', () => {
        // the name is whatever the request sent, so it can be any text
        captureError(() => validateFieldChange('kwame mensah lives at GA-183-9385', 1));

        const logged = JSON.stringify((console.log as jest.Mock).mock.calls);
        expect(logged).toContain('Field does not exist');
        expect(logged).not.toContain('kwame');
        expect(logged).not.toContain('GA-183-9385');
    });

    it('does not write a rejected address to the server log', () => {
        // what a contributor typed can be a real location even when its format is wrong
        captureError(() => validateFieldChange('location_gps_address', 'ga-183-9385'));

        const logged = JSON.stringify((console.log as jest.Mock).mock.calls);
        expect(logged).toContain('location_gps_address');
        expect(logged).not.toContain('ga-183-9385');
    });
});

describe('validateFieldChange() for fields that already had a format check', () => {

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('still accepts a well-formed demolished building record', () => {
        const demolishedBuildings = [{
            year_constructed: { min: 1950, max: 1960 },
            year_demolished: { min: 1990, max: 1995 },
            overlap_present: '50%',
            links: ['https://example.com/record']
        }];

        expect(() => validateFieldChange('demolished_buildings', demolishedBuildings)).not.toThrow();
    });

    it('still rejects a malformed demolished building record', () => {
        const error = captureError(() => validateFieldChange('demolished_buildings', [{ overlap_present: 'most' }]));

        expect(error).toBeInstanceOf(FieldTypeError);
        expect(error).toHaveProperty('fieldName', 'demolished_buildings');
    });
});
