import db from '../../db';

interface AutofillOption {
    id: string;
    value: string;
    similarity?: number;
}

type GetAutofillOptionsFn = (value: string, all?: boolean) => Promise<AutofillOption[]>;

const autofillFunctionMap : { [fieldName: string] : GetAutofillOptionsFn } = {
    current_landuse_group: getLanduseGroupOptions,
    typology_original_use: getLanduseGroupOptions,
    location_town: getPlaceOptions,
};

// Full-text expression matched against for place search (name + ascii + variants)
const PLACE_SEARCH_TEXT = `coalesce(name, '') || ' ' || coalesce(asciiname, '') || ' ' || coalesce(alternatenames, '')`;

// Region-qualified label ("Kumasi, Ashanti Region") used both as the suggestion
// shown to the user and the value stored on the building.
const PLACE_LABEL = `name || coalesce(', ' || admin1_name, '')`;

function getPlaceOptions(value: string, all: boolean = false) {
    if(all) {
        // 16k+ places is too many to list; offer the largest settlements as a
        // sensible default when no query has been typed yet.
        return db.manyOrNone(`
            SELECT
                geonameid::text AS id,
                ${PLACE_LABEL} AS value
            FROM reference_tables.places
            ORDER BY population DESC NULLS LAST, name
            LIMIT 50
            `
        );
    }

    const query = buildPartialMatchQuery(value);

    return db.manyOrNone(`
        SELECT
            geonameid::text AS id,
            ${PLACE_LABEL} AS value,
            ts_rank(to_tsvector('simple', ${PLACE_SEARCH_TEXT}), to_tsquery('simple', $1)) AS similarity
        FROM reference_tables.places
        WHERE to_tsvector('simple', ${PLACE_SEARCH_TEXT}) @@ to_tsquery('simple', $1)
        ORDER BY similarity DESC, population DESC NULLS LAST, name
        LIMIT 20
        `, [query]
    );
}

function getLanduseGroupOptions(value: string, all: boolean = false) {
    if(all) {
        return db.manyOrNone(`
            SELECT
                landuse_id AS id,
                description AS value
            FROM reference_tables.buildings_landuse_group
            ORDER BY description
            `
        );
    }

    let query = buildPartialMatchQuery(value);

    return db.manyOrNone(`
        SELECT
            landuse_id AS id,
            description AS value,
            ts_rank(to_tsvector('simple', description), to_tsquery('simple', $1)) AS similarity
        FROM reference_tables.buildings_landuse_group
        WHERE to_tsvector('simple', description) @@ to_tsquery('simple', $1)
        ORDER BY similarity DESC, description
        `, [query]
    );
}

function buildPartialMatchQuery(value: string) {
    return tokenizeValue(value).map(x => `${x}:*`).join(' & ');
}
function tokenizeValue(value: string) {
    return value.split(/[^\w]+/).filter(x => x !== '');
}

export function getAutofillOptions(fieldName: string, fieldValue: any, allValues: boolean) {
    const optionsFn = autofillFunctionMap[fieldName];

    if (optionsFn == undefined) {
        throw new Error(`Autofill options not available for field '${fieldName}'`);
    }

    return optionsFn(fieldValue, allValues);
}
