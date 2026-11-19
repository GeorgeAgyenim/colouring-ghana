/**
 * A boundary layer switched off while its file is still downloading must show the boundaries when it is
 * switched on again, without downloading the file a second time.
 * Ticket: docs/tickets/location-search/issues/02-boundary-layer-blank-after-quick-toggle.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MapContainer } from 'react-leaflet';

import { apiGet } from '../../../apiHelpers';
import { DisplayPreferencesProvider } from '../../../displayPreferences-context';
import { RegionSwitcher } from '../../boundary-switcher';
import { RegionBoundaryLayer } from '../admin-boundary-layer';

jest.mock('../../../apiHelpers');

const REGIONS_URL = '/geometries/Gh_adm_bnd_L1.geojson';

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

    /** Renders the map into the container; rendering again without the layer removes only the layer. */
    function renderMap({ withLayer }: { withLayer: boolean }): void {
        act(() => {
            ReactDOM.render(
                <DisplayPreferencesProvider>
                    <RegionSwitcher />
                    {/* preferCanvas: jsdom cannot build Leaflet's default SVG renderer for the boundary lines. */}
                    <MapContainer center={[5.6, -0.19]} zoom={8} preferCanvas>
                        {withLayer && <RegionBoundaryLayer />}
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
});
