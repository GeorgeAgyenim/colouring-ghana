/**
 * Every image on the welcome, contact, log-in and sign-up pages is addressed from the site's base path,
 * so it loads whatever the page's own address is and whether or not the site is served from a sub-path.
 * The tests look at every image on each page, so an image added later with a relative address fails here.
 * Ticket: docs/tickets/location-search/issues/11-asset-addresses-carry-the-base-path.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Login } from '../../user/login';
import { SignUp } from '../../user/signup';
import ContactPage from '../contact';
import Welcome from '../welcome';

/** The address of every image on the page, as the server would render it. */
function imageAddresses(Page: React.ComponentType): string[] {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
        <StaticRouter location="/">
            <Page />
        </StaticRouter>
    );
    return Array.from(container.querySelectorAll('img')).map(img => img.getAttribute('src'));
}

const pages: [string, React.ComponentType][] = [
    ['welcome', Welcome],
    ['contact', ContactPage],
    ['log-in', Login],
    ['sign-up', SignUp],
];

describe('image addresses', () => {
    const originalSubdirectory = process.env.SUBDIRECTORY;

    afterEach(() => {
        if (originalSubdirectory == undefined) {
            delete process.env.SUBDIRECTORY;
        } else {
            process.env.SUBDIRECTORY = originalSubdirectory;
        }
    });

    test.each(pages)('every image on the %s page carries the base path when the site is served from a sub-path', (_name, Page) => {
        process.env.SUBDIRECTORY = '/colouringghana';
        const addresses = imageAddresses(Page);
        expect(addresses.length).toBeGreaterThan(0);
        addresses.forEach(address => expect(address).toMatch(/^\/colouringghana\/images\//));
    });

    test.each(pages)('every image on the %s page starts at the site root when the site is served from the root', (_name, Page) => {
        delete process.env.SUBDIRECTORY;
        const addresses = imageAddresses(Page);
        expect(addresses.length).toBeGreaterThan(0);
        addresses.forEach(address => expect(address).toMatch(/^\/images\//));
    });
});
