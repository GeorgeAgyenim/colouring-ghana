/**
 * The welcome page's link to the data extracts stays inside the site when it is served from a sub-path.
 * Ticket: docs/tickets/location-search/issues/03-links-bypass-base-path.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import Welcome from '../welcome';

/** The address of the "data-extracts" link, as the page is rendered under the given base path. */
function dataExtractsHref(basename?: string): string | null {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
        <StaticRouter basename={basename} location="/">
            <Welcome />
        </StaticRouter>
    );
    const link = Array.from(page.querySelectorAll('a')).find(a => a.textContent === 'data-extracts');
    return link == undefined ? null : link.getAttribute('href');
}

describe('<Welcome />', () => {
    test('the data extracts link carries the base path when the site is served from a sub-path', () => {
        expect(dataExtractsHref('/colouringghana')).toBe('/colouringghana/data-extracts.html');
    });

    test('the data extracts link is unchanged when the site is served from the root', () => {
        expect(dataExtractsHref()).toBe('/data-extracts.html');
    });
});
