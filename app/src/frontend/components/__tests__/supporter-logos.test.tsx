/**
 * The log-in and sign-up pages name Colouring Ghana's own partners, the ones the Ghana team chose for the
 * welcome page: KNUST (the lead organisation), the Colouring Cities Research Programme and Loughborough
 * University, each with its logo and a link to its site. Nothing from the London project is left on them.
 * Ticket: docs/tickets/location-search/issues/18-london-leftovers.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Login } from '../../user/login';
import { SignUp } from '../../user/signup';

/** The page as the server would render it. */
function renderedPage(Page: React.ComponentType): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
        <StaticRouter location="/">
            <Page />
        </StaticRouter>
    );
    return container;
}

/** The address the logo with this description links to, or null when no such logo is on the page. */
function linkOfLogo(page: HTMLElement, description: string): string | null {
    const logo = Array.from(page.querySelectorAll('img')).find(img => img.getAttribute('alt') === description);
    return logo?.closest('a')?.getAttribute('href') ?? null;
}

const pages: [string, React.ComponentType][] = [
    ['log-in', Login],
    ['sign-up', SignUp],
];

const partners: [string, string][] = [
    ['Kwame Nkrumah University of Science and Technology', 'https://www.knust.edu.gh/'],
    ['Colouring Cities Research Programme', 'https://colouringcities.org/'],
    ['Loughborough University', 'https://www.lboro.ac.uk/'],
];

describe('partners on the log-in and sign-up pages', () => {
    describe.each(pages)('the %s page', (_name, Page) => {
        test.each(partners)('shows the logo of %s, linked to its site', (description, address) => {
            expect(linkOfLogo(renderedPage(Page), description)).toBe(address);
        });

        test('names no London partner', () => {
            const page = renderedPage(Page);
            const text = page.textContent + ' ' + Array.from(page.querySelectorAll('img'))
                .map(img => `${img.getAttribute('alt')} ${img.getAttribute('src')}`).join(' ');
            const links = Array.from(page.querySelectorAll('a')).map(a => a.getAttribute('href')).join(' ');

            for (const londonName of [
                'London', 'UCL', 'University College', 'CASA', 'Centre for Advanced Spatial Analysis',
                'Historic England', 'Ordnance Survey', 'Mayor', 'logo-casa', 'logo-ucl', 'logo-he', 'logo-os',
                'logo-gla',
            ]) {
                expect(text).not.toContain(londonName);
            }
            for (const londonSite of ['ucl.ac.uk', 'historicengland', 'ordnancesurvey', 'london.gov.uk']) {
                expect(links).not.toContain(londonSite);
            }
        });
    });
});
