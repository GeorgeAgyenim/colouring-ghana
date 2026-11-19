/**
 * A click on the map looks up the building under it. The map tells the app when that lookup fails,
 * so the app can say that nothing was changed instead of leaving the person without an answer.
 * Ticket: docs/tickets/location-search/issues/09-paste-onto-buildings-shows-the-result.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { apiGet } from '../../apiHelpers';
import { DisplayPreferencesProvider } from '../../displayPreferences-context';
import { Building } from '../../models/building';
import { ColouringMap } from '../map';

jest.mock('../../apiHelpers');

describe('<ColouringMap /> click on the map', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;
    let onBuildingAction: jest.Mock;
    let onBuildingLookupStarted: jest.Mock;
    let onBuildingLookupFailed: jest.Mock;
    /** What the building lookup answers; a test replaces it to make the lookup fail. */
    let lookup: () => Promise<Building[]>;

    beforeEach(async () => {
        // jsdom has no canvas; Leaflet may draw on one. Any drawing call is a no-op.
        HTMLCanvasElement.prototype.getContext = (() =>
            new Proxy({}, { get: () => () => undefined })) as unknown as typeof originalGetContext;

        lookup = () => Promise.resolve([{ building_id: 7 } as Building]);
        apiGetMock.mockReset();
        apiGetMock.mockImplementation((path: string) =>
            path.startsWith('/api/buildings/locate') ?
                lookup() :
                // every other request the map makes on start-up (boundary files)
                Promise.resolve({ type: 'FeatureCollection', features: [] })
        );

        onBuildingAction = jest.fn();
        onBuildingLookupStarted = jest.fn();
        onBuildingLookupFailed = jest.fn();

        container = document.createElement('div');
        document.body.appendChild(container);
        // awaited, so the boundary files the map asks for on start-up have arrived before a test clicks
        await act(async () => {
            ReactDOM.render(
                <MemoryRouter>
                    <DisplayPreferencesProvider>
                        <ColouringMap
                            mode="multi-edit"
                            revisionId="1"
                            onBuildingAction={onBuildingAction}
                            onBuildingLookupStarted={onBuildingLookupStarted}
                            onBuildingLookupFailed={onBuildingLookupFailed}
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

    /** Clicks the map as a mouse would, and waits for the lookup to settle. */
    async function clickMap(): Promise<void> {
        await act(async () => {
            container.querySelector('.leaflet-container')
                .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
        });
    }

    test('hands the building under the click to the app', async () => {
        await clickMap();

        expect(onBuildingAction).toHaveBeenCalledTimes(1);
        expect(onBuildingAction).toHaveBeenCalledWith({ building_id: 7 });
        expect(onBuildingLookupFailed).not.toHaveBeenCalled();
    });

    test('tells the app when a click starts, before the building has been looked up', async () => {
        let answer: (buildings: Building[]) => void;
        lookup = () => new Promise(resolve => { answer = resolve; });

        await clickMap();

        expect(onBuildingLookupStarted).toHaveBeenCalledTimes(1);
        expect(onBuildingAction).not.toHaveBeenCalled();

        await act(async () => answer([{ building_id: 7 } as Building]));
        expect(onBuildingAction).toHaveBeenCalledWith({ building_id: 7 });
    });

    test('when an earlier click\'s lookup answers after a later one, only the later click counts', async () => {
        const answers: ((buildings: Building[]) => void)[] = [];
        lookup = () => new Promise(resolve => { answers.push(resolve); });

        await clickMap();
        await clickMap();
        await act(async () => answers[1]([{ building_id: 8 } as Building]));
        await act(async () => answers[0]([{ building_id: 7 } as Building]));

        expect(onBuildingAction).toHaveBeenCalledTimes(1);
        expect(onBuildingAction).toHaveBeenCalledWith({ building_id: 8 });
    });

    test('tells the app when the server answers the lookup with an error', async () => {
        lookup = () => Promise.resolve({ error: 'Database error' } as unknown as Building[]);

        await clickMap();

        expect(onBuildingLookupFailed).toHaveBeenCalledTimes(1);
        expect(onBuildingAction).not.toHaveBeenCalled();
    });

    test('tells the app when the building could not be looked up', async () => {
        lookup = () => Promise.reject(new TypeError('Failed to fetch'));

        await clickMap();

        expect(onBuildingLookupFailed).toHaveBeenCalledTimes(1);
        expect(onBuildingAction).not.toHaveBeenCalled();
    });
});
