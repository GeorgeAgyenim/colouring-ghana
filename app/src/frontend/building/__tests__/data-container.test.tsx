/**
 * The edit form saves only through the page's script. Until the script has loaded the form is plain
 * HTML, so the test reads it from the HTML the server would send: it is sent by POST (a GET would put
 * every field value into the address) and names no address of its own, because the server has no
 * handler that saves such a post.
 * Ticket: docs/tickets/location-search/issues/10-forms-submitted-before-the-script-loads.md
 *
 * This replaces the two tests written for docs/tickets/location-search/issues/03-links-bypass-base-path.md,
 * which checked that the form's address carried the base path. Issue 10 removes that address on
 * purpose, so there is no address left to check.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Building } from '../../models/building';
import withCopyEdit from '../data-container';

const DataContainer = withCopyEdit(() => <p>category fields</p>);

/** The edit form, as rendered for building 123 in the "location" category. */
function editForm(): HTMLFormElement | null {
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
    return page.querySelector('form');
}

describe('edit form, as the server sends it', () => {
    const originalSubdirectory = process.env.SUBDIRECTORY;

    afterEach(() => {
        if (originalSubdirectory == undefined) {
            delete process.env.SUBDIRECTORY;
        } else {
            process.env.SUBDIRECTORY = originalSubdirectory;
        }
    });

    test('is sent by POST, so a submit before the script loads keeps field values out of the address', () => {
        // the HTML attribute is not case-sensitive; React writes it as given
        expect(editForm().getAttribute('method').toLowerCase()).toBe('post');
    });

    test.each([
        ['the root', undefined],
        ['a sub-path', '/colouringghana'],
    ])('names no address of its own when the site is served from %s', (name, subdirectory) => {
        if (subdirectory == undefined) {
            delete process.env.SUBDIRECTORY;
        } else {
            process.env.SUBDIRECTORY = subdirectory;
        }
        expect(editForm().hasAttribute('action')).toBe(false);
    });
});
