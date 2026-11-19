/**
 * The map's layer options on a phone: one small button opens a list with the light/dark map switch and the
 * Regions, Districts and Editable Buildings switches, each saying whether it is on, and closes it again.
 * From 990px wide the layout is as before: the theme switch stays outside the list.
 * Ticket: docs/tickets/location-search/issues/19-layer-buttons-on-phones.md
 *
 * jsdom does not apply media queries, so these tests check what the page is made of and how it behaves;
 * which parts show at which width is set by the classes the stylesheet hides, and is checked in a browser.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { apiGet } from '../../apiHelpers';
import { DisplayPreferencesProvider } from '../../displayPreferences-context';
import { ColouringMap } from '../map';

jest.mock('../../apiHelpers');

const REGIONS_URL = '/geometries/Gh_adm_bnd_L1.geojson';
const DISTRICTS_URL = '/geometries/Gh_adm_bnd_L2.geojson';

/** The class the stylesheet hides from 990px wide, and the one it hides below 990px. */
const NARROW_ONLY = 'narrow-screen-only';
const WIDE_ONLY = 'wide-screen-only';

describe('<ColouringMap /> layer options', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;

    beforeEach(async () => {
        // jsdom has no canvas; Leaflet may draw on one. Any drawing call is a no-op.
        HTMLCanvasElement.prototype.getContext = (() =>
            new Proxy({}, { get: () => () => undefined })) as unknown as typeof originalGetContext;

        apiGetMock.mockReset();
        // Every file the map asks for arrives empty: these tests are about the buttons, not the drawing.
        apiGetMock.mockImplementation(() => Promise.resolve({ type: 'FeatureCollection', features: [] }));

        container = document.createElement('div');
        document.body.appendChild(container);
        await act(async () => {
            ReactDOM.render(
                <MemoryRouter>
                    <DisplayPreferencesProvider>
                        <ColouringMap
                            mode="view"
                            revisionId="1"
                            onBuildingAction={() => undefined}
                            mapColourScale={undefined}
                            onMapColourScale={() => undefined}
                            categoryMapDefinitions={[]}
                        />
                    </DisplayPreferencesProvider>
                </MemoryRouter>,
                container
            );
        });
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    /** The button that opens and closes the layer options: the one that says whether a list is expanded. */
    function optionsButton(): HTMLButtonElement {
        const buttons = container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]');
        expect(buttons).toHaveLength(1);
        return buttons[0];
    }

    /** The list the options button opens, found the way a screen reader finds it: by aria-controls. */
    function optionsList(): HTMLElement {
        const id = optionsButton().getAttribute('aria-controls');
        expect(id).toBeTruthy();
        const list = document.getElementById(id);
        expect(list).not.toBeNull();
        return list;
    }

    /** The visible text of each button in the list, top to bottom. */
    function listedControls(): string[] {
        return Array.from(optionsList().querySelectorAll('button')).map(button => button.textContent);
    }

    /** The button in the list whose visible text starts with the given words. */
    function listedControl(startOfText: string): HTMLButtonElement {
        const button = Array.from(optionsList().querySelectorAll('button'))
            .find(candidate => candidate.textContent.startsWith(startOfText));
        expect(button).toBeDefined();
        return button;
    }

    /**
     * What a screen reader calls the options button at one screen size: its text, leaving out what that
     * size hides and what is hidden from screen readers (the icon).
     */
    function optionsButtonName(screen: 'narrow' | 'wide'): string {
        const hiddenAtThisSize = screen === 'narrow' ? WIDE_ONLY : NARROW_ONLY;
        const copy = optionsButton().cloneNode(true) as HTMLElement;
        copy.querySelectorAll(`.${hiddenAtThisSize}, [aria-hidden="true"]`).forEach(node => node.remove());
        return copy.textContent.trim();
    }

    /** Presses a button as a person would, and lets any download it starts settle. */
    async function press(button: HTMLButtonElement): Promise<void> {
        await act(async () => button.click());
    }

    test('the layer options button is closed at first and says what it does on a phone and on a wide screen', () => {
        const button = optionsButton();

        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(optionsButtonName('narrow')).toBe('Show map layers');
        // From 990px wide the button reads as it always has.
        expect(optionsButtonName('wide')).toBe('Show layer options');
        expect(listedControls()).toEqual([]);
    });

    test('while closed, the options button is the only map button on a phone; the theme switch is for wide screens', () => {
        const menuButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('form.map-button button'));
        const others = menuButtons.filter(button => button !== optionsButton());

        expect(others.map(button => button.textContent)).toEqual(['Switch to light mode']);
        expect(others[0].closest(`.${WIDE_ONLY}`)).not.toBeNull();
        expect(optionsButton().closest(`.${WIDE_ONLY}, .${NARROW_ONLY}`)).toBeNull();
    });

    test('pressing it opens a list with the theme, Regions, Districts and Editable Buildings switches', async () => {
        await press(optionsButton());

        expect(optionsButton().getAttribute('aria-expanded')).toBe('true');
        expect(optionsButtonName('narrow')).toBe('Hide map layers');
        expect(optionsButtonName('wide')).toBe('Hide layer options');
        expect(listedControls()).toEqual([
            'Switch to light mode',
            'Regions off',
            'Districts off',
            'Editable Buildings [on]',
        ]);
        // On a wide screen the theme switch stays outside the list, as before, so the one in the list is for phones.
        expect(listedControl('Switch to').closest(`.${NARROW_ONLY}`)).not.toBeNull();
        expect(listedControl('Regions').closest(`.${NARROW_ONLY}, .${WIDE_ONLY}`)).toBeNull();
    });

    test('the layer switches say whether each layer is on, and switching one on downloads its boundaries', async () => {
        await press(optionsButton());
        const regions = listedControl('Regions');
        const districts = listedControl('Districts');
        const editable = listedControl('Editable Buildings');
        // The state is in the button's own words ("on"/"off"), which a screen reader reads too; a pressed state
        // as well would be read twice ("Regions on, pressed"), so there is none.
        expect([regions, districts, editable].map(button => button.textContent))
            .toEqual(['Regions off', 'Districts off', 'Editable Buildings [on]']);
        expect([regions, districts, editable].some(button => button.hasAttribute('aria-pressed'))).toBe(false);

        await press(districts);

        expect(districts.textContent).toBe('Districts on');
        expect(apiGetMock).toHaveBeenCalledWith(DISTRICTS_URL);
        expect(apiGetMock).not.toHaveBeenCalledWith(REGIONS_URL);

        await press(regions);

        expect(regions.textContent).toBe('Regions on');
        expect(apiGetMock).toHaveBeenCalledWith(REGIONS_URL);

        await press(editable);

        expect(editable.textContent).toBe('Editable Buildings [off]');

        await press(districts);

        expect(districts.textContent).toBe('Districts off');
    });

    test('the theme switch in the list switches the map between dark and light', async () => {
        await press(optionsButton());

        await press(listedControl('Switch to light mode'));

        expect(listedControl('Switch to').textContent).toBe('Switch to dark mode');
        // the wide-screen theme switch shows the same state
        const wideTheme = container.querySelector<HTMLButtonElement>(`.${WIDE_ONLY} button`);
        expect(wideTheme.textContent).toBe('Switch to dark mode');

        await press(listedControl('Switch to dark mode'));

        expect(listedControl('Switch to').textContent).toBe('Switch to light mode');
    });

    test('pressing the options button again closes the list; the layers keep their state', async () => {
        await press(optionsButton());
        await press(listedControl('Districts'));

        await press(optionsButton());

        expect(optionsButton().getAttribute('aria-expanded')).toBe('false');
        expect(optionsButtonName('narrow')).toBe('Show map layers');
        expect(listedControls()).toEqual([]);

        await press(optionsButton());

        expect(listedControl('Districts').textContent).toBe('Districts on');
    });

    test('the stylesheet no longer hides the map buttons on narrow screens', () => {
        const css = fs.readFileSync(path.join(__dirname, '..', 'map-button.css'), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        const narrowBlocks = mediaBlocks(css).filter(block => /max-width/.test(block.query));
        const hidingRules = narrowBlocks
            .flatMap(block => block.body.match(/[^{}]*\{[^}]*\}/g) ?? [])
            .filter(rule => /\.map-button/.test(rule.split('{')[0]) && /visibility\s*:\s*hidden/.test(rule));

        expect(hidingRules).toEqual([]);
    });
});

/** Each `@media` block in a stylesheet: its query and the rules inside it (one level of nesting, as in CSS). */
function mediaBlocks(css: string): { query: string; body: string }[] {
    const blocks: { query: string; body: string }[] = [];
    const mediaPattern = /@media([^{]*)\{/g;
    let match: RegExpExecArray | null;
    while ((match = mediaPattern.exec(css)) !== null) {
        let depth = 1;
        let end = mediaPattern.lastIndex;
        while (depth > 0 && end < css.length) {
            if (css[end] === '{') {
                depth++;
            } else if (css[end] === '}') {
                depth--;
            }
            end++;
        }
        blocks.push({ query: match[1], body: css.slice(mediaPattern.lastIndex, end - 1) });
        mediaPattern.lastIndex = end;
    }
    return blocks;
}
