/**
 * Utility functions for parsing
 *
 */

/**
 * Parse a string as positive integer or NaN
 *
 * @param {string} value
 * @returns {number} integer or NaN
 */
function strictParseInt(value) {
    if (/^([1-9][0-9]*)$/.test(value)) {
        return Number(value);
    }
    return NaN;
}

/**
 * Strip the query part and fragment from a URL, leaving the path
 *
 * The server hands the parsers the whole `req.url` (`/view/age-history/1?sc=2`), so they read the path alone.
 * Ticket: docs/tickets/location-search/issues/14-building-pages-fail-on-the-server.md
 *
 * @param {String} url
 * @returns {String} path without query part or fragment
 */
function pathOf(url) {
    return url.split(/[?#]/, 1)[0];
}

/**
 * Parse building ID from URL
 *
 * @param {String} url
 * @returns {number|undefined}
 */
function parseBuildingURL(url) {
    const re = /\/(\d+)(\/history)?$/;
    const matches = re.exec(pathOf(url));

    if (matches && matches.length >= 2) {
        return strictParseInt(matches[1]);
    }
    return undefined;
}

/**
 * Parse category slug from URL
 *
 * @param {String} url
 * @returns {String} [age]
 */
function parseCategoryURL(url) {
    const defaultCat = 'age';
    const path = pathOf(url);
    if (path === '/') {
        return defaultCat;
    }
    const matches = /^\/(view|edit|multi-edit)\/([^/.]+)/.exec(path);
    const cat = (matches && matches.length >= 3) ? matches[2] : defaultCat;
    return cat;
}

export { strictParseInt, parseBuildingURL, parseCategoryURL };
