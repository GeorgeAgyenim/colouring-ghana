/**
 * Only "Save edits" submits the edit form.
 * A button with no type counts as a submit button in HTML. Until the page's script has loaded, pressing
 * one inside the edit form would send the form; so every other button in the form says type="button".
 * Every building category is rendered with its real fields, to the HTML the server would send.
 * (The test reads the HTML back through `document`, so it runs where `document` exists.)
 * Ticket: docs/tickets/location-search/issues/10-forms-submitted-before-the-script-loads.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { categoryUiConfig } from '../../../config/category-ui-config';
import { Building } from '../../../models/building';
import Verification from '../../data-components/verification';

type Mode = 'view' | 'edit';

/** A short description of a button, for a readable failure message. */
function describeButton(button: Element): string {
    const label = button.textContent.trim() || button.getAttribute('title') || button.getAttribute('class') || '';
    return `<button type=${JSON.stringify(button.getAttribute('type'))}> ${label}`.trim();
}

/** The buttons inside the edit form of building 123's category, in the given mode. */
function editFormButtons(cat: string, mode: Mode): Element[] {
    const Container = categoryUiConfig[cat];
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
        <StaticRouter location={`/${mode}/${cat}/123`}>
            <Container
                title=""
                cat={cat}
                intro=""
                help=""
                mode={mode}
                building={{ building_id: 123, revision_id: '1', verified: {} } as Building}
                user_verified={{}}
                user={{ username: 'test-user' }}
                onBuildingUpdate={() => undefined}
                onUserVerifiedUpdate={() => undefined}
                mapColourScale={undefined}
                onMapColourScale={() => undefined}
            />
        </StaticRouter>
    );
    const form = page.querySelector('form');
    return Array.from(form.querySelectorAll('button, input[type="submit"], input[type="image"]'));
}

/** The form's own two submit buttons: the hidden one that stops Enter from saving, and "Save edits". */
function isTheFormsOwnSubmitButton(button: Element): boolean {
    return button.getAttribute('type') === 'submit' && (
        (button.hasAttribute('disabled') && button.textContent === '') ||
        button.textContent.trim() === 'Save edits'
    );
}

const categories = Object.keys(categoryUiConfig);
const modes: Mode[] = ['view', 'edit'];
const everyCategoryInEveryMode = categories.flatMap(cat => modes.map(mode => [cat, mode] as [string, Mode]));

describe('buttons inside the edit form, in the HTML the server would send', () => {
    test.each(everyCategoryInEveryMode)('%s (%s): no button other than "Save edits" submits the form', (cat, mode) => {
        const others = editFormButtons(cat, mode).filter(button => !isTheFormsOwnSubmitButton(button));

        expect(others.filter(button => button.getAttribute('type') !== 'button').map(describeButton)).toEqual([]);
    });

    test('the map buttons of the community and disaster management categories are among the buttons checked', () => {
        for (const cat of ['community', 'disaster-management']) {
            const mapButtons = editFormButtons(cat, 'edit')
                .filter(button => button.classList.contains('map-switcher-inline'));
            expect(mapButtons.length).toBeGreaterThan(0);
        }
    });

    test.each([
        ['Verify', false],
        ['Remove', true],
    ])('the "%s" button beside a field does not submit the form', (label, alreadyVerified) => {
        const page = document.createElement('div');
        page.innerHTML = renderToStaticMarkup(
            <Verification
                slug="date_year"
                allow_verify={true}
                onVerify={() => undefined}
                user_verified={alreadyVerified}
                user_verified_as="1900"
                verified_count={1}
            />
        );
        const button = page.querySelector('button');

        expect(button.textContent.trim()).toBe(label);
        expect(button.getAttribute('type')).toBe('button');
    });
});
