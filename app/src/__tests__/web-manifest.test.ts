/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/18-london-leftovers.md
 *
 * A phone that adds the site to its home screen names it from the web manifest (public/site.webmanifest),
 * so the manifest names Colouring Ghana.
 */
import fs from 'fs';
import path from 'path';

const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'site.webmanifest'), 'utf8')
);

describe('the web manifest', () => {
    test('names the site Colouring Ghana', () => {
        expect(manifest.name).toBe('Colouring Ghana');
    });

    test('gives Colouring Ghana as the short name shown under the home-screen icon', () => {
        expect(manifest.short_name).toBe('Colouring Ghana');
    });
});
