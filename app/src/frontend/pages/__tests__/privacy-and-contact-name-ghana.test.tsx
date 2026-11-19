/**
 * The privacy policy and contact page name the people who run Colouring Ghana, not the London project.
 * Ticket: docs/tickets/location-search/issues/20-privacy-policy-and-contact-page.md
 *
 * Each page is rendered as the server sends it, and the whole markup (text and link addresses) is checked.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import ContactPage from '../contact';
import PrivacyPolicyPage from '../privacy-policy';

const wordsFromLondonProject = [
    'Turing',
    'UCL',
    'CASA',
    'London',
    'Information Commissioner',
    'Mailgun',
    'Ordnance Survey',
    'Privacy statement goes here',
];

const departmentWebsite = 'https://geomatics.knust.edu.gh/';
const departmentEmailLink = 'mailto:geomaticeng@knust.edu.gh';
const dataProtectionCommissionWebsite = 'https://www.dataprotection.org.gh/';

function pageAsServerSendsIt(page: React.ReactElement, location: string) {
    const markup = renderToStaticMarkup(
        <StaticRouter location={location}>
            {page}
        </StaticRouter>
    );
    const element = document.createElement('div');
    element.innerHTML = markup;
    const linkAddresses = Array.from(element.querySelectorAll('a')).map(a => a.getAttribute('href'));
    return { markup, text: element.textContent, linkAddresses };
}

const pages = [
    { name: 'privacy policy', ...pageAsServerSendsIt(<PrivacyPolicyPage />, '/privacy-policy.html') },
    { name: 'contact page', ...pageAsServerSendsIt(<ContactPage />, '/contact.html') },
];

describe.each(pages.map(page => [page.name, page] as const))('the %s', (_name, { markup, text, linkAddresses }) => {
    test.each(wordsFromLondonProject)('does not contain "%s"', word => {
        // Whole words only, so that e.g. "featuring" does not count as "Turing".
        expect(markup).not.toMatch(new RegExp(`\\b${word}\\b`, 'i'));
    });

    test('names the Department of Geomatic Engineering at KNUST', () => {
        expect(text).toContain('Department of Geomatic Engineering');
        expect(text).toContain('Kwame Nkrumah University of Science and Technology');
    });

    test('links the website and email address of the department', () => {
        expect(linkAddresses).toContain(departmentWebsite);
        expect(linkAddresses).toContain(departmentEmailLink);
    });
});

describe('the privacy policy', () => {
    const privacyPolicy = pages[0];

    test('names the data protection law of Ghana and links its regulator', () => {
        expect(privacyPolicy.text).toContain('Data Protection Act, 2012 (Act 843)');
        expect(privacyPolicy.text).toContain('Data Protection Commission');
        expect(privacyPolicy.linkAddresses).toContain(dataProtectionCommissionWebsite);
    });

    test('says where the data is stored', () => {
        expect(privacyPolicy.text).toContain('Concordia University');
    });
});

describe('the contact page', () => {
    const contactPage = pages[1];

    test('asks map users to credit the real sources of this site', () => {
        expect(contactPage.text).toContain('Colouring Cities contributors');
        expect(contactPage.text).toContain('OpenStreetMap contributors');
    });
});
