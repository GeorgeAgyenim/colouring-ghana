/**
 * The privacy policy's contact link opens an email instead of leading to a page that does not exist.
 * Ticket: docs/tickets/location-search/issues/13-privacy-policy-email-link.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import PrivacyPolicyPage from '../privacy-policy';

describe('<PrivacyPolicyPage />', () => {
    test('every link showing an email address opens an email to that address', () => {
        const page = document.createElement('div');
        page.innerHTML = renderToStaticMarkup(
            <StaticRouter location="/privacy-policy.html">
                <PrivacyPolicyPage />
            </StaticRouter>
        );

        const emailLinks = Array.from(page.querySelectorAll('a')).filter(a => a.textContent.includes('@'));

        expect(emailLinks.length).toBeGreaterThan(0);
        emailLinks.forEach(link => {
            expect(link.getAttribute('href')).toBe(`mailto:${link.textContent}`);
        });
    });
});
