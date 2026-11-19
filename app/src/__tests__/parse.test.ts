/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/14-building-pages-fail-on-the-server.md
 * (first fixed on another line as docs/tickets/building-view/issues/02-building-preload-drops-query-string.md)
 *
 * The server reads the building id from the page's address to decide which building to put in the page it
 * sends. The address it is given includes the query part (`?sc=2` opens one section of a category), so the
 * parsers must read the id and the category from the path alone.
 */
import { parseBuildingURL, parseCategoryURL, strictParseInt } from '../parse';

describe('parseBuildingURL', () => {
    it('returns the building id from a building address', () => {
        expect(parseBuildingURL('/view/age-history/1')).toBe(1);
    });

    it('returns the building id from a building history address', () => {
        expect(parseBuildingURL('/view/age-history/1/history')).toBe(1);
    });

    it('ignores a query part after the building id', () => {
        expect(parseBuildingURL('/view/age-history/1?sc=2')).toBe(1);
        expect(parseBuildingURL('/edit/age-history/1?sc=2')).toBe(1);
    });

    it('ignores a query part after the history segment', () => {
        expect(parseBuildingURL('/view/age-history/1/history?sc=2')).toBe(1);
        expect(parseBuildingURL('/view/age-history/1/history?x=1')).toBe(1);
    });

    it('ignores a fragment after the building id', () => {
        expect(parseBuildingURL('/view/age-history/1#top')).toBe(1);
    });

    it('returns undefined for an address with no building id', () => {
        expect(parseBuildingURL('/view/age-history')).toBeUndefined();
        expect(parseBuildingURL('/view/age-history?sc=2')).toBeUndefined();
        expect(parseBuildingURL('/')).toBeUndefined();
    });

    it('returns NaN for an id that is not a positive whole number', () => {
        expect(parseBuildingURL('/view/age-history/0')).toBeNaN();
        expect(parseBuildingURL('/view/age-history/007?sc=2')).toBeNaN();
    });
});

describe('parseCategoryURL', () => {
    it('returns the category from the address', () => {
        expect(parseCategoryURL('/view/age-history/1')).toBe('age-history');
        expect(parseCategoryURL('/edit/location')).toBe('location');
    });

    it('falls back to age for the home page and other pages', () => {
        expect(parseCategoryURL('/')).toBe('age');
        expect(parseCategoryURL('/about')).toBe('age');
    });

    it('does not read the query part as part of the category', () => {
        expect(parseCategoryURL('/view/age-history?sc=2')).toBe('age-history');
        expect(parseCategoryURL('/?sc=2')).toBe('age');
    });
});

describe('strictParseInt', () => {
    it('accepts only positive whole numbers without leading zeros', () => {
        expect(strictParseInt('1')).toBe(1);
        expect(strictParseInt('0')).toBeNaN();
        expect(strictParseInt('07')).toBeNaN();
        expect(strictParseInt('9a')).toBeNaN();
    });
});
