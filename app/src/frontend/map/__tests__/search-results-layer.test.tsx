/**
 * Search result pins: a teardrop with a see-through centre, sized for the pointer in use.
 * Design source: docs/images/search-pins/.
 * Ticket: docs/tickets/location-search/issues/22-see-through-search-pins.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MapContainer } from 'react-leaflet';

import { SearchResultsLayer } from '../search-results-layer';
import { SearchResult } from '../search-box';

const KUMASI: SearchResult = {
    id: 1,
    type: 'Feature',
    attributes: { label: 'Kumasi, Ashanti', search_class: 'town', zoom: 14 },
    geometry: { type: 'Point', coordinates: [-1.6244, 6.6885] },
};

describe('<SearchResultsLayer /> pins', () => {
    const originalMatchMedia = window.matchMedia;
    let container: HTMLDivElement;

    /** Makes the browser report a touch screen (coarse pointer) or a mouse. */
    function fakePointer(kind: 'coarse' | 'fine'): void {
        window.matchMedia = ((query: string) => ({
            matches: query === '(pointer: coarse)' && kind === 'coarse',
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    }

    function renderPins(hoveredId: number | null = null): void {
        act(() => {
            ReactDOM.render(
                <MapContainer center={[6.6885, -1.6244]} zoom={10}>
                    <SearchResultsLayer results={[KUMASI]} hoveredId={hoveredId} onSelect={() => undefined} />
                </MapContainer>,
                container
            );
        });
    }

    function pin(): HTMLElement {
        const pins = container.querySelectorAll<HTMLElement>('.leaflet-marker-icon');
        expect(pins).toHaveLength(1);
        return pins[0];
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        fakePointer('fine');
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        window.matchMedia = originalMatchMedia;
    });

    test('has no box or white fill behind it, so the map shows through the centre', () => {
        renderPins();

        expect(pin().classList).not.toContain('leaflet-div-icon');
        const fills = Array.from(pin().querySelectorAll('svg *'))
            .map(el => el.getAttribute('fill'))
            .filter((fill): fill is string => fill !== null);
        expect(fills.map(f => f.toUpperCase())).toEqual(['NONE', '#F06A1D']);
        // The body is cut with a hole, which is what lets the map show through.
        expect(pin().querySelector('path[fill-rule="evenodd"]')).not.toBeNull();
    });

    test('with a mouse, is 32 by 51 pixels with its tip on the place', () => {
        renderPins();

        expect(pin().style.width).toBe('32px');
        expect(pin().style.height).toBe('51px');
        expect(pin().style.marginLeft).toBe('-16px');
        expect(pin().style.marginTop).toBe('-49px');
        expect(pin().querySelector('path[stroke-width="3"]')).not.toBeNull();
    });

    test('on a touch screen, is 40 by 64 pixels with its tip on the place', () => {
        fakePointer('coarse');
        renderPins();

        expect(pin().style.width).toBe('40px');
        expect(pin().style.height).toBe('64px');
        expect(pin().style.marginLeft).toBe('-20px');
        expect(pin().style.marginTop).toBe('-62px');
        expect(pin().querySelector('path[stroke-width="4"]')).not.toBeNull();
    });

    test('when its result is hovered in the list, grows and turns red', () => {
        renderPins(KUMASI.id);

        expect(pin().style.width).toBe('40px');
        expect(pin().style.height).toBe('64px');
        expect(pin().innerHTML.toUpperCase()).toContain('FILL="#E5484D"');
    });
});
