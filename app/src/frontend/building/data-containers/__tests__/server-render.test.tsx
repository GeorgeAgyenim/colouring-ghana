/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/14-building-pages-fail-on-the-server.md
 * (first fixed on another line as docs/tickets/building-view/issues/01-server-render-building-route-window.md)
 *
 * Every building category renders on the server, where there is no `window`. The `sc` part of the address
 * (`?sc=2`) still decides which section of the category starts open: only the matching section, and with no
 * `sc` every section starts closed.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { categoryUiConfig } from '../../../config/category-ui-config';
import { Building } from '../../../models/building';

// The categories only read the building's attributes, so an otherwise empty building is enough.
const building = {
    building_id: 1,
    geometry_id: 1,
    revision_id: '1',
    verified: {},
    planning_data: [],
} as unknown as Building;

/** The HTML the server would send for the category at the given address. */
function renderOnServer(cat: string, address: string): string {
    const Container = categoryUiConfig[cat];
    return renderToString(
        <StaticRouter location={address} context={{}}>
            <Container
                title={cat}
                cat={cat}
                intro=""
                help=""
                mode="view"
                building={building}
                user_verified={{}}
                onBuildingUpdate={() => undefined}
                onUserVerifiedUpdate={() => undefined}
                mapColourScale={undefined}
                onMapColourScale={() => undefined}
            />
        </StaticRouter>
    );
}

/** Each section's name, in page order, with whether it starts open (its body follows its header). */
function sections(markup: string): { name: string, open: boolean }[] {
    const section = /<span class="data-entry-group-title">([^<]*)<\/span><\/div><div class="([^"]*)"/g;
    return Array.from(markup.matchAll(section), ([, name, bodyClass]) => ({
        name: name.replace(/&amp;/g, '&'),
        open: !bodyClass.split(' ').includes('collapse'),
    }));
}

function openSections(markup: string): string[] {
    return sections(markup).filter(s => s.open).map(s => s.name);
}

const categories = Object.keys(categoryUiConfig);

describe('building categories in the HTML the server sends', () => {
    test.each(categories)('%s renders without a window', cat => {
        const markup = renderOnServer(cat, `/view/${cat}/1?sc=2`);

        expect(sections(markup).length).toBeGreaterThan(0);
    });

    test.each(categories)('%s: with no sc every section starts closed', cat => {
        const markup = renderOnServer(cat, `/view/${cat}/1`);

        expect(openSections(markup)).toEqual([]);
    });

    test.each([
        ['age-history', '2', ['Building Age/Construction Date (Crowdsourced)']],
        ['urban-infrastructure', '2', ['Street/Pavement']],
        ['retrofit-condition', '7', ['Condition']],
        ['land-use', '4', ['Original (Historical) Use']],
    ])('%s?sc=%s opens only the matching section', (cat, sc, expected) => {
        const markup = renderOnServer(cat, `/view/${cat}/1?sc=${sc}`);

        expect(openSections(markup)).toEqual(expected);
    });
});
