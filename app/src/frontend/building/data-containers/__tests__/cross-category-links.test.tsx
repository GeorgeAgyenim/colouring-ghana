/**
 * Links from one building category to another stay inside the site when it is served from a sub-path.
 * They are router links, so the router adds the base path. The "?sc=" part of the address is kept.
 * Ticket: docs/tickets/location-search/issues/03-links-bypass-base-path.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Building } from '../../../models/building';
import { DataContainerType } from '../../data-container';
import CommunityContainer from '../community';
import ConstructionDesignContainer from '../construction-design';
import TypologySizeContainer from '../typology-size';

/** Addresses of the links with the given text, as building 123's category is rendered under the base path. */
function linkHrefs(Container: DataContainerType, cat: string, linkText: string, basename?: string): (string | null)[] {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
        <StaticRouter basename={basename} location={`/view/${cat}/123`}>
            <Container
                title=""
                cat={cat}
                intro=""
                help=""
                mode="view"
                building={{ building_id: 123, revision_id: '1', verified: {} } as Building}
                user_verified={{}}
                onBuildingUpdate={() => undefined}
                onUserVerifiedUpdate={() => undefined}
                mapColourScale={undefined}
                onMapColourScale={() => undefined}
            />
        </StaticRouter>
    );
    return Array.from(page.querySelectorAll('a'))
        .filter(a => a.textContent === linkText)
        .map(a => a.getAttribute('href'));
}

describe('links between building categories', () => {
    test('carry the base path when the site is served from a sub-path', () => {
        expect(linkHrefs(CommunityContainer, 'community', 'here', '/colouringghana'))
            .toEqual(['/colouringghana/view/planning-conservation/123']);
        expect(linkHrefs(TypologySizeContainer, 'typology-size', 'Age & History', '/colouringghana'))
            .toEqual(['/colouringghana/view/age-history/123?sc=2']);
        expect(linkHrefs(ConstructionDesignContainer, 'construction-design', 'Age & History', '/colouringghana'))
            .toEqual([
                '/colouringghana/view/age-history/123?sc=1',
                '/colouringghana/view/age-history/123?sc=3'
            ]);
    });

    test('are unchanged when the site is served from the root', () => {
        expect(linkHrefs(CommunityContainer, 'community', 'here'))
            .toEqual(['/view/planning-conservation/123']);
        expect(linkHrefs(TypologySizeContainer, 'typology-size', 'Age & History'))
            .toEqual(['/view/age-history/123?sc=2']);
        expect(linkHrefs(ConstructionDesignContainer, 'construction-design', 'Age & History'))
            .toEqual(['/view/age-history/123?sc=1', '/view/age-history/123?sc=3']);
    });
});
