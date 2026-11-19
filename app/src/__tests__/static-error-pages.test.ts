/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/17-small-error-and-page-fixes.md
 *
 * The plain error pages in public/ (404.html, 500.html) are copied from Colouring London. They are served
 * as files by express.static at /404.html and /500.html, which is /colouringghana/404.html behind the
 * proxy; nothing in the app sends them in place of another page. They name this project, and every link
 * on them is relative to the page, so it stays inside the site wherever the site is served.
 */
import fs from 'fs';
import path from 'path';

const publicDir = path.join(__dirname, '..', '..', 'public');

describe.each(['404.html', '500.html'])('the static error page %s', (file) => {
    const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
    const links = Array.from(html.matchAll(/\shref\s*=\s*["']([^"']*)["']/gi), match => match[1]);

    test('names Colouring Ghana and not Colouring London', () => {
        expect(html).toContain('Colouring Ghana');
        expect(html).not.toMatch(/London/i);
    });

    test('links to the home page, relative to the page', () => {
        expect(links).toContain('./');
    });

    test('has no link anchored at the site root or on another site', () => {
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            expect(link).not.toMatch(/^\//);
            expect(link).not.toMatch(/^[a-z][a-z0-9+.-]*:/i);
        }
    });
});
