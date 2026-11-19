/**
 * The edit form posts to an address inside the site when it is served from a sub-path.
 * The address only matters when the form is submitted without JavaScript, so the test reads it from
 * the HTML the server would send.
 * Ticket: docs/tickets/location-search/issues/03-links-bypass-base-path.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Building } from '../../models/building';
import withCopyEdit from '../data-container';

const DataContainer = withCopyEdit(() => <p>category fields</p>);

/** The edit form's address, as rendered for building 123 in the "location" category. */
function editFormAction(): string | null {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
        <StaticRouter location="/edit/location/123">
            <DataContainer
                title="Location"
                cat="location"
                intro=""
                help=""
                mode="edit"
                building={{ building_id: 123, revision_id: '1' } as Building}
                onBuildingUpdate={() => undefined}
                onUserVerifiedUpdate={() => undefined}
                mapColourScale={undefined}
                onMapColourScale={() => undefined}
            />
        </StaticRouter>
    );
    const form = page.querySelector('form');
    return form == undefined ? null : form.getAttribute('action');
}

describe('edit form address', () => {
    const originalSubdirectory = process.env.SUBDIRECTORY;

    afterEach(() => {
        if (originalSubdirectory == undefined) {
            delete process.env.SUBDIRECTORY;
        } else {
            process.env.SUBDIRECTORY = originalSubdirectory;
        }
    });

    test('carries the base path when the site is served from a sub-path', () => {
        process.env.SUBDIRECTORY = '/colouringghana';
        expect(editFormAction()).toBe('/colouringghana/edit/location/123');
    });

    test('is unchanged when the site is served from the root', () => {
        delete process.env.SUBDIRECTORY;
        expect(editFormAction()).toBe('/edit/location/123');
    });
});
