/**
 * @jest-environment node
 *
 * Unit tests for the URL parsers the server uses to decide which building (if any) to preload.
 * Fix ticket: docs/tickets/building-view/issues/02-building-preload-drops-query-string.md
 */
import { parseBuildingURL, parseCategoryURL, strictParseInt } from '../parse';

describe('parseBuildingURL', () => {
    it('returns the building id from a plain building URL', () => {
        expect(parseBuildingURL('/view/age-history/95')).toBe(95);
    });

    it('returns the building id from a history URL', () => {
        expect(parseBuildingURL('/view/age-history/95/history')).toBe(95);
    });

    it('ignores a query string after the building id', () => {
        expect(parseBuildingURL('/view/age-history/95?sc=2')).toBe(95);
    });

    it('ignores a query string after the history segment', () => {
        expect(parseBuildingURL('/view/age-history/95/history?sc=2')).toBe(95);
        expect(parseBuildingURL('/view/age-history/95/history?x=1')).toBe(95);
    });

    it('ignores a fragment after the building id', () => {
        expect(parseBuildingURL('/view/age-history/95#top')).toBe(95);
    });

    it('returns undefined for a category URL with no building id', () => {
        expect(parseBuildingURL('/view/age-history')).toBeUndefined();
        expect(parseBuildingURL('/view/age-history?sc=2')).toBeUndefined();
        expect(parseBuildingURL('/')).toBeUndefined();
    });

    it('returns NaN for an id that is not a positive integer', () => {
        expect(parseBuildingURL('/view/age-history/0')).toBeNaN();
        expect(parseBuildingURL('/view/age-history/007?sc=2')).toBeNaN();
    });
});

describe('parseCategoryURL', () => {
    it('returns the category slug', () => {
        expect(parseCategoryURL('/view/age-history/95')).toBe('age-history');
        expect(parseCategoryURL('/edit/location')).toBe('location');
    });

    it('defaults to age for the root and unknown paths', () => {
        expect(parseCategoryURL('/')).toBe('age');
        expect(parseCategoryURL('/about')).toBe('age');
    });

    it('does not read the query string as part of the slug', () => {
        expect(parseCategoryURL('/view/age-history?sc=2')).toBe('age-history');
    });
});

describe('strictParseInt', () => {
    it('accepts only positive integers without leading zeros', () => {
        expect(strictParseInt('95')).toBe(95);
        expect(strictParseInt('0')).toBeNaN();
        expect(strictParseInt('07')).toBeNaN();
        expect(strictParseInt('9a')).toBeNaN();
    });
});
