/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/01-search-relevance-and-index-integrity.md
 *
 * How map search chooses and orders the five results it shows from the candidates the
 * trigram index returns. Distances are pg_trgm's: `word_dist` is how far the typed text is
 * from the closest run of words in the stored text (0 = it appears there whole), `dist` the
 * distance between the two whole strings. Distances are like those PostgreSQL gave for these
 * texts on 20 November 2026; ids and populations are made up to exercise each rule.
 */
import { rankSearchCandidates, SearchCandidate } from '../search';

jest.mock('../../../db', () => ({ __esModule: true, default: {} }));

let nextId = 1;

function candidate(fields: Partial<SearchCandidate>): SearchCandidate {
    return {
        search_id: nextId++,
        search_str: 'Somewhere',
        display_label: null,
        search_class: 'town',
        st_asgeojson: '{"type":"Point","coordinates":[-1.6,6.7]}',
        zoom: 14,
        place_id: null,
        population: null,
        word_dist: 0,
        dist: 0,
        ...fields
    };
}

function labels(results: SearchCandidate[]): string[] {
    return results.map(result => result.display_label ?? result.search_str);
}

describe('rankSearchCandidates()', () => {

    it('returns nothing when no candidate is close enough to what was typed', () => {
        // zzqqxxjj: the nearest stored names are all at word distance 0.89
        const results = rankSearchCandidates([
            candidate({ search_str: 'Zinabo', display_label: 'Zinabo, Bono', word_dist: 0.89, dist: 0.94 }),
            candidate({ search_str: 'Zaklikofe', display_label: 'Zaklikofe, Volta', word_dist: 0.89, dist: 0.94 })
        ]);

        expect(results).toEqual([]);
    });

    it('keeps a misspelling that is close (accrra -> Accra) and drops one that is not', () => {
        const results = rankSearchCandidates([
            candidate({ search_str: 'Accra', display_label: 'Accra, Greater Accra', place_id: '2306104', word_dist: 0.38, dist: 0.38 }),
            candidate({ search_str: 'Hale and hearty sports centre', search_class: 'name', word_dist: 0.71, dist: 0.9 })
        ]);

        expect(labels(results)).toEqual(['Accra, Greater Accra']);
    });

    it('puts the bigger place first when several match equally well (kumasi)', () => {
        const results = rankSearchCandidates([
            candidate({ search_str: 'Kumasi-Ejisu', display_label: 'Kumasi-Ejisu, Ejisu', search_class: 'street', word_dist: 0, dist: 0.46 }),
            candidate({ search_str: 'Kumasi', display_label: 'Kumasi, Volta', place_id: '2299522', population: '0', word_dist: 0, dist: 0 }),
            candidate({ search_str: 'Kumasi', display_label: 'Kumasi, Ashanti', place_id: '2298890', population: '1468609', word_dist: 0, dist: 0 }),
            candidate({ search_str: 'Kumasi', display_label: 'Kumasi, Western', place_id: '2299521', population: '2500', word_dist: 0, dist: 0 })
        ]);

        expect(labels(results)).toEqual([
            'Kumasi, Ashanti',
            'Kumasi, Western',
            'Kumasi, Volta',
            'Kumasi-Ejisu, Ejisu'
        ]);
    });

    it('ranks a closer match above a bigger place, whatever the population (tamal)', () => {
        const results = rankSearchCandidates([
            candidate({ search_str: 'Tamale Port', display_label: 'Tamale Port, Savannah', place_id: '1', population: '5000', word_dist: 0.17, dist: 0.5 }),
            candidate({ search_str: 'Tamalugu', display_label: 'Tamalugu, Northern', place_id: '2', population: '900000', word_dist: 0.29, dist: 0.4 }),
            candidate({ search_str: 'Tamale', display_label: 'Tamale, Northern', place_id: '3', population: '0', word_dist: 0.17, dist: 0.17 })
        ]);

        expect(labels(results)).toEqual(['Tamale Port, Savannah', 'Tamale, Northern', 'Tamalugu, Northern']);
    });

    it('treats an unknown population like a population of 0 and then prefers the closer whole text', () => {
        // a village GeoNames lists with population 0 and a building of the same name
        const results = rankSearchCandidates([
            candidate({ search_str: 'Asafo', display_label: 'Asafo, Volta', place_id: '1', population: '0', word_dist: 0, dist: 0.3 }),
            candidate({ search_str: 'Asafo', search_class: 'name', word_dist: 0, dist: 0 })
        ]);

        expect(results.map(result => result.search_class)).toEqual(['name', 'town']);
    });

    it('orders full ties the same way every time, by index row', () => {
        // the small places called Kumasi: same distance, population 0
        const results = rankSearchCandidates([
            candidate({ search_id: 52, display_label: 'Kumasi, Volta', place_id: '1', population: '0' }),
            candidate({ search_id: 7, display_label: 'Kumasi, Central', place_id: '2', population: '0' }),
            candidate({ search_id: 31, display_label: 'Kumasi, Western', place_id: '3', population: '0' })
        ]);

        expect(labels(results)).toEqual(['Kumasi, Central', 'Kumasi, Western', 'Kumasi, Volta']);
    });

    it('shows a place once, by its best-matching spelling (acra)', () => {
        // GeoNames lists Acra and ACC as other spellings of Accra: three rows, one place
        const results = rankSearchCandidates([
            candidate({ search_str: 'Accra', display_label: 'Accra, Greater Accra', place_id: '2306104', population: '1963264', word_dist: 0.4, dist: 0.4 }),
            candidate({ search_str: 'Acra', display_label: 'Accra, Greater Accra', place_id: '2306104', population: '1963264', word_dist: 0, dist: 0 }),
            candidate({ search_str: 'Acra', display_label: 'Acra, Central', place_id: '7', population: '0', word_dist: 0, dist: 0 })
        ]);

        expect(labels(results)).toEqual(['Accra, Greater Accra', 'Acra, Central']);
        expect(results[0].search_str).toBe('Acra');
    });

    it('keeps rows that are not towns apart, even with the same text', () => {
        // two buildings with the same public name are two places
        const results = rankSearchCandidates([
            candidate({ search_str: 'Kingdom Hall', search_class: 'name' }),
            candidate({ search_str: 'Kingdom Hall', search_class: 'name' })
        ]);

        expect(results).toHaveLength(2);
    });

    it('returns at most five results', () => {
        const results = rankSearchCandidates(
            [...Array(8).keys()].map(i => candidate({ search_str: `Road ${i}`, search_class: 'street', word_dist: i / 100 }))
        );

        expect(labels(results)).toEqual(['Road 0', 'Road 1', 'Road 2', 'Road 3', 'Road 4']);
    });
});
