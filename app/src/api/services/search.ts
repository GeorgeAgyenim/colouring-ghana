/**
 * Search table access
 * - to support navigation around the map
 * - some separation from building attributes - here we might use other points of interest
 *   or cues to broadly locate the user (postcode, borough name...)
 * - this DOES expose geometry, another reason to keep this clearly separated from building
 *   data
 *
 * Ranking: docs/tickets/location-search/issues/01-search-relevance-and-index-integrity.md
 */
import db from '../../db';
import { logErrorSafely } from '../logError';

/** One row of search_locations as read for ranking. bigint columns arrive as strings. */
export interface SearchCandidate {
    search_id: number;
    search_str: string;
    display_label: string | null;
    search_class: string;
    st_asgeojson: string;
    zoom: number;
    place_id: string | null;
    population: string | null;
    /** pg_trgm word distance from the typed text to search_str (0 = appears whole) */
    word_dist: number;
    /** pg_trgm distance between the typed text and the whole of search_str */
    dist: number;
}

/**
 * Candidates further than this from what was typed are not shown. It is pg_trgm's default
 * word similarity threshold (0.6) as a distance. Measured on the development index,
 * 20 November 2026: typos such as accrra, tamalle, capecoast and takordi are at 0.25-0.38;
 * unrelated text (zzqqxxjj, qwerty, xyzzy) is at 0.67 or more.
 */
const MAX_WORD_DISTANCE = 0.4;

/** Unknown population counts as 0, which is also what GeoNames records when it does not know. */
function populationOf(candidate: SearchCandidate): number {
    return Number(candidate.population ?? 0);
}

/**
 * Closest word match first; among equally close matches the bigger place, then the closer
 * whole text, then the earlier index row, so the order never depends on how the database
 * happened to return ties.
 */
function compareCandidates(a: SearchCandidate, b: SearchCandidate): number {
    return (a.word_dist - b.word_dist)
        || (populationOf(b) - populationOf(a))
        || (a.dist - b.dist)
        || (a.search_id - b.search_id);
}

/** How many results the search box shows. */
const RESULT_LIMIT = 5;

/** A town is one place however many spellings it has; every other row is its own place. */
function placeKey(candidate: SearchCandidate): string {
    return candidate.place_id != null ? `place:${candidate.place_id}` : `row:${candidate.search_id}`;
}

/**
 * Choose the results to show from the candidates read from the index: drop those too far
 * from what was typed, order the rest (see compareCandidates), keep the best row of each
 * place, and return at most RESULT_LIMIT.
 */
export function rankSearchCandidates(candidates: SearchCandidate[]): SearchCandidate[] {
    const seen = new Set<string>();
    return candidates
        .filter(candidate => candidate.word_dist <= MAX_WORD_DISTANCE)
        .sort(compareCandidates)
        .filter(candidate => {
            const key = placeKey(candidate);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, RESULT_LIMIT);
}

/**
 * How many of the nearest index rows are read before ranking. More than RESULT_LIMIT, so
 * that the rows of one place can be merged and a bigger place can win a tie; on the
 * development index (20 November 2026) `kumasi` has 29 rows that contain it whole.
 */
const CANDIDATE_LIMIT = 25;

/**
 * Up to five places for what was typed (docs/location-search.md, "Ranking").
 * The ORDER BY reads the nearest rows by word distance through the trigram index
 * (trgm_gist_idx_search_str) and breaks ties the way rankSearchCandidates does, so the
 * candidates read include the bigger places; rankSearchCandidates makes the final choice.
 */
function queryLocation(term: string): Promise<SearchCandidate[] | undefined> {
    return db.manyOrNone<SearchCandidate>(
        `SELECT
            search_id, search_str, display_label, search_class, ST_AsGeoJSON(center), zoom,
            place_id, population,
            $1 <<-> search_str AS word_dist,
            $1 <-> search_str AS dist
        FROM
            search_locations
        ORDER BY
            word_dist, coalesce(population, 0) DESC, dist, search_id
        LIMIT $2;`,
        [term, CANDIDATE_LIMIT]
    ).then(rankSearchCandidates).catch((error) => {
        logErrorSafely('Location search failed:', error);
        return undefined;
    });
}

export {
    queryLocation
};
