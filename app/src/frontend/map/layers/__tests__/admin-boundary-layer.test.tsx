/**
 * The Regions and Districts boundary layers.
 * - A layer switched off while its file is still downloading shows the boundaries when it is switched on
 *   again, without downloading the file a second time.
 *   Ticket: docs/tickets/location-search/issues/02-boundary-layer-blank-after-quick-toggle.md
 * - A file that fails to download is reported on the map, with a way to try again.
 *   Ticket: docs/tickets/location-search/issues/12-boundary-download-failure-is-shown.md
 */
import type { Map as LeafletMap } from 'leaflet';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MapContainer } from 'react-leaflet';

import { apiGet } from '../../../apiHelpers';
import { DisplayPreferencesProvider } from '../../../displayPreferences-context';
import { DistrictSwitcher, RegionSwitcher } from '../../boundary-switcher';
import { DistrictBoundaryLayer, RegionBoundaryLayer } from '../admin-boundary-layer';

jest.mock('../../../apiHelpers');

const REGIONS_URL = '/geometries/Gh_adm_bnd_L1.geojson';
const DISTRICTS_URL = '/geometries/Gh_adm_bnd_L2.geojson';

/** One region, shaped like the real boundary file: a polygon named by its ADM1_EN property. */
const regionsGeojson = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: { ADM1_EN: 'Greater Accra' },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-0.5, 5.4], [0.1, 5.4], [0.1, 5.9], [-0.5, 5.9], [-0.5, 5.4]]],
        },
    }],
};

/** A download the test finishes by hand, so it controls what happens while the file is on its way. */
interface PendingDownload {
    succeed: (data: unknown) => Promise<void>;
    fail: (error: Error) => Promise<void>;
}

describe('<RegionBoundaryLayer />', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;
    let map: LeafletMap;
    let downloads: PendingDownload[];
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
        // jsdom has no canvas; Leaflet draws the boundary lines on one. Any drawing call is a no-op.
        HTMLCanvasElement.prototype.getContext = (() =>
            new Proxy({}, { get: () => () => undefined })) as unknown as typeof originalGetContext;

        downloads = [];
        apiGetMock.mockReset();
        apiGetMock.mockImplementation(() => new Promise((resolve, reject) => {
            // The component reacts to the result in a later microtask, so each settle is awaited inside act.
            downloads.push({
                succeed: data => act(async () => resolve(data)),
                fail: error => act(async () => reject(error)),
            });
        }));

        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        container = document.createElement('div');
        document.body.appendChild(container);
        renderMap({ withLayer: true });
    });

    /**
     * Renders the map into the container; rendering again without the layer removes only the layer.
     * Rendering again with districts adds the Districts button and layer after the Regions ones.
     */
    function renderMap({ withLayer, withDistricts = false }: { withLayer: boolean; withDistricts?: boolean }): void {
        act(() => {
            ReactDOM.render(
                <DisplayPreferencesProvider>
                    <RegionSwitcher />
                    {withDistricts && <DistrictSwitcher />}
                    {/* preferCanvas: jsdom cannot build Leaflet's default SVG renderer for the boundary lines. */}
                    <MapContainer center={[5.6, -0.19]} zoom={8} preferCanvas whenCreated={created => { map = created; }}>
                        {withLayer && <RegionBoundaryLayer />}
                        {withDistricts && <DistrictBoundaryLayer />}
                    </MapContainer>
                </DisplayPreferencesProvider>,
                container
            );
        });
    }

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        consoleError.mockRestore();
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    /** Presses the "Regions on/off" button, as a person would to switch the layer. */
    function switchRegions(): void {
        const button = container.querySelector<HTMLButtonElement>('form.map-button button');
        expect(button).not.toBeNull();
        act(() => button.click());
    }

    /** The region names drawn on the map; a name is only there while its boundary is drawn. */
    function regionLabels(): string[] {
        return Array.from(container.querySelectorAll('.region-label')).map(label => label.textContent);
    }

    test('downloads nothing until the layer is switched on, then draws the boundaries', async () => {
        expect(apiGetMock).not.toHaveBeenCalled();

        switchRegions();
        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(apiGetMock).toHaveBeenCalledWith(REGIONS_URL);
        expect(regionLabels()).toEqual([]);

        await downloads[0].succeed(regionsGeojson);

        expect(regionLabels()).toEqual(['Greater Accra']);
        expect(consoleError).not.toHaveBeenCalled();
    });

    test('switched off before the file arrives, then on again: the boundaries are drawn and the file was requested once', async () => {
        switchRegions();
        switchRegions();

        await downloads[0].succeed(regionsGeojson);
        // Still switched off, so nothing is drawn yet.
        expect(regionLabels()).toEqual([]);

        switchRegions();

        expect(regionLabels()).toEqual(['Greater Accra']);
        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(consoleError).not.toHaveBeenCalled();
    });

    test('after a failed download, switching the layer on again requests the file again', async () => {
        switchRegions();
        const failure = new Error('network down');
        await downloads[0].fail(failure);

        expect(consoleError).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledWith(`Failed to load boundary layer ${REGIONS_URL}`, failure);
        expect(regionLabels()).toEqual([]);

        switchRegions();
        switchRegions();

        expect(apiGetMock).toHaveBeenCalledTimes(2);
        await downloads[1].succeed(regionsGeojson);
        expect(regionLabels()).toEqual(['Greater Accra']);
        expect(consoleError).toHaveBeenCalledTimes(1);
    });

    test('a file that arrives after the layer was removed from the map is ignored without a React warning', async () => {
        switchRegions();
        expect(apiGetMock).toHaveBeenCalledTimes(1);

        renderMap({ withLayer: false });
        await downloads[0].succeed(regionsGeojson);

        // The map is still there; only the layer is gone. React reports a state update on a removed
        // component through console.error, so a silent console means none was attempted.
        expect(container.querySelector('.leaflet-container')).not.toBeNull();
        expect(regionLabels()).toEqual([]);
        expect(consoleError).not.toHaveBeenCalled();
    });

    // The tests from here on: a boundary file that fails to download says so on the map and offers another try.
    // Ticket: docs/tickets/location-search/issues/12-boundary-download-failure-is-shown.md

    /** The failure messages shown over the map. role="alert" is what makes a screen reader announce them. */
    function failureMessages(): HTMLElement[] {
        return Array.from(container.querySelectorAll<HTMLElement>('[role="alert"]'));
    }

    /** Presses "Try again" on the first failure message, as a person would. */
    function pressTryAgain(): void {
        const button = container.querySelector<HTMLButtonElement>('[role="alert"] button');
        expect(button).not.toBeNull();
        act(() => button.click());
    }

    test('a failed download while the layer is on shows a message naming the layer, with a Try again button', async () => {
        switchRegions();
        expect(failureMessages()).toEqual([]);

        await downloads[0].fail(new Error('network down'));

        const messages = failureMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].textContent).toContain('Could not load the region boundaries. Check your connection.');
        const button = messages[0].querySelector('button');
        expect(button.textContent).toBe('Try again');
        // A plain button: reachable with the keyboard, and it submits nothing.
        expect(button.type).toBe('button');
        expect(button.disabled).toBe(false);
        expect(regionLabels()).toEqual([]);
    });

    test('Try again requests the file again; when it arrives the boundaries are drawn and the message is gone', async () => {
        switchRegions();
        await downloads[0].fail(new Error('network down'));

        pressTryAgain();

        expect(apiGetMock).toHaveBeenCalledTimes(2);
        expect(apiGetMock).toHaveBeenLastCalledWith(REGIONS_URL);
        // While the new download is on its way the message stays, says so, and a second press starts nothing.
        expect(failureMessages()).toHaveLength(1);
        expect(failureMessages()[0].querySelector('button').textContent).toBe('Trying again…');
        pressTryAgain();
        expect(apiGetMock).toHaveBeenCalledTimes(2);

        await downloads[1].succeed(regionsGeojson);

        expect(regionLabels()).toEqual(['Greater Accra']);
        expect(failureMessages()).toEqual([]);
        expect(consoleError).toHaveBeenCalledTimes(1);
    });

    test('when Try again fails too, the message and the button stay where they were, and keep the keyboard focus', async () => {
        switchRegions();
        await downloads[0].fail(new Error('network down'));
        const button = failureMessages()[0].querySelector('button');
        button.focus();

        pressTryAgain();
        await downloads[1].fail(new Error('still down'));

        expect(failureMessages()).toHaveLength(1);
        expect(failureMessages()[0].querySelector('button')).toBe(button);
        expect(button.textContent).toBe('Try again');
        expect(document.activeElement).toBe(button);
    });

    test('a download that fails after the layer was switched off shows no message, then or at the next switch-on', async () => {
        switchRegions();
        switchRegions();
        await downloads[0].fail(new Error('network down'));
        expect(failureMessages()).toEqual([]);

        const observer = new MutationObserver(() => undefined);
        observer.observe(container, { childList: true, subtree: true });
        switchRegions();
        const addedMessages = observer.takeRecords()
            .flatMap(record => Array.from(record.addedNodes))
            .filter(node => node instanceof HTMLElement && node.matches('[role="alert"]'));
        observer.disconnect();

        expect(addedMessages).toEqual([]);
        // switching on again tries again
        expect(apiGetMock).toHaveBeenCalledTimes(2);
    });

    test('switching the layer off removes the message', async () => {
        switchRegions();
        await downloads[0].fail(new Error('network down'));
        expect(failureMessages()).toHaveLength(1);

        switchRegions();

        expect(failureMessages()).toEqual([]);
        // Switching off does not itself start a download.
        expect(apiGetMock).toHaveBeenCalledTimes(1);
    });

    test('switching the layer on again after a failure does not show the old message while the new download is on its way', async () => {
        switchRegions();
        await downloads[0].fail(new Error('network down'));
        switchRegions();

        // A screen reader announces a message the moment it is added, even if it is taken away again
        // straight after, so watch for one being added at any point during the switch-on.
        const observer = new MutationObserver(() => undefined);
        observer.observe(container, { childList: true, subtree: true });
        switchRegions();
        const addedMessages: Node[] = [];
        for (const record of observer.takeRecords()) {
            record.addedNodes.forEach(node => {
                if (node instanceof HTMLElement && node.matches('[role="alert"]')) {
                    addedMessages.push(node);
                }
            });
        }
        observer.disconnect();

        expect(addedMessages).toEqual([]);
        expect(apiGetMock).toHaveBeenCalledTimes(2);
    });

    test('an answer that is not boundary data counts as a failed download and can be tried again', async () => {
        switchRegions();
        // What a server or proxy error written as JSON looks like: the download itself "succeeds".
        await downloads[0].succeed({ error: 'Server error' });

        expect(failureMessages()).toHaveLength(1);
        expect(regionLabels()).toEqual([]);
        expect(consoleError).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenLastCalledWith(`Failed to load boundary layer ${REGIONS_URL}`, expect.any(Error));

        // A second failure, this time of the download itself, shows the message again.
        pressTryAgain();
        const failure = new Error('network down');
        await downloads[1].fail(failure);

        expect(failureMessages()).toHaveLength(1);
        expect(consoleError).toHaveBeenCalledTimes(2);
        expect(consoleError).toHaveBeenLastCalledWith(`Failed to load boundary layer ${REGIONS_URL}`, failure);

        pressTryAgain();
        expect(apiGetMock).toHaveBeenCalledTimes(3);
        await downloads[2].succeed(regionsGeojson);

        expect(regionLabels()).toEqual(['Greater Accra']);
        expect(failureMessages()).toEqual([]);
        expect(consoleError).toHaveBeenCalledTimes(2);
    });

    test('pressing Try again does not also click the map underneath', async () => {
        const mapClicked = jest.fn();
        map.on('click', mapClicked);
        switchRegions();
        await downloads[0].fail(new Error('network down'));

        pressTryAgain();

        expect(apiGetMock).toHaveBeenCalledTimes(2);
        expect(mapClicked).not.toHaveBeenCalled();

        // A click anywhere else on the map does reach it, so the check above is a real one.
        act(() => container.querySelector<HTMLElement>('.leaflet-container').click());
        expect(mapClicked).toHaveBeenCalledTimes(1);
    });

    test('a second try that fails after the layer was removed from the map shows nothing and gives no React warning', async () => {
        switchRegions();
        await downloads[0].fail(new Error('network down'));
        pressTryAgain();

        renderMap({ withLayer: false });
        const failure = new Error('network still down');
        await downloads[1].fail(failure);

        // Each failed download is logged once. React reports a state update on a removed component
        // through console.error as well, so exactly two calls means none was attempted.
        expect(container.querySelector('.leaflet-container')).not.toBeNull();
        expect(failureMessages()).toEqual([]);
        expect(consoleError).toHaveBeenCalledTimes(2);
        expect(consoleError).toHaveBeenLastCalledWith(`Failed to load boundary layer ${REGIONS_URL}`, failure);
    });

    test('when the regions and the districts both fail, both messages are shown in one box and each retries its own file', async () => {
        renderMap({ withLayer: true, withDistricts: true });
        const [regionsButton, districtsButton] = Array.from(
            container.querySelectorAll<HTMLButtonElement>('form.map-button button')
        );
        act(() => regionsButton.click());
        act(() => districtsButton.click());
        await downloads[0].fail(new Error('network down'));
        await downloads[1].fail(new Error('network down'));

        const messages = failureMessages();
        expect(messages.map(message => message.textContent)).toEqual([
            expect.stringContaining('Could not load the region boundaries.'),
            expect.stringContaining('Could not load the district boundaries.'),
        ]);
        // One shared box lays them out one above the other; two separate boxes would sit on top of each other.
        expect(messages[1].parentElement).toBe(messages[0].parentElement);

        act(() => messages[1].querySelector('button').click());

        expect(apiGetMock).toHaveBeenCalledTimes(3);
        expect(apiGetMock).toHaveBeenLastCalledWith(DISTRICTS_URL);
        // only the district message says it is trying again; the region one is untouched
        expect(messages.map(message => message.querySelector('button').textContent))
            .toEqual(['Try again', 'Trying again…']);

        await downloads[2].succeed(regionsGeojson);
        expect(failureMessages()).toEqual([messages[0]]);
    });
});
