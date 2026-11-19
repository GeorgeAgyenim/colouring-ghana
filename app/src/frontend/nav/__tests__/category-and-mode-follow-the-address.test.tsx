/**
 * The building panel shows the category and mode the page's address names, from its very first drawing.
 * Ticket: docs/tickets/location-search/issues/16-server-draws-the-default-category.md
 *
 * The whole app is rendered in the browser (jsdom), signed in. Two things are faked:
 * - the Leaflet map (it cannot be loaded here): a stand-in records what the app gives the map, so a test can
 *   click a building the way the real map does;
 * - the API (no server, no database): a building's edit history is answered only when the test says, so a
 *   test can let that answer arrive after the panel that asked for it has gone.
 *
 * The server's side (the HTML the page route sends) is in src/__tests__/building-page-server-render.test.tsx.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { renderToString } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, StaticRouter } from 'react-router-dom';

import { App } from '../../app';
import { Building } from '../../models/building';

let mockMapProps: {
    onBuildingAction: (building: Building) => void;
};

jest.mock('../../map/map', () => ({
    ColouringMap: (props) => {
        mockMapProps = props;
        return null;
    }
}));

const user = { username: 'tester' };

const building = {
    building_id: 1,
    geometry_id: 1,
    revision_id: '1',
    date_year: 1923,
    verified: {},
    uprns: [],
    planning_data: [],
} as unknown as Building;

/** An edit history request the app has sent and the test has not answered yet. */
interface HistoryRequest {
    url: string;
    answer: () => void;
}

describe('the building panel follows the page\'s address', () => {
    const originalFetch = global.fetch;

    let container: HTMLDivElement;
    let historyRequests: HistoryRequest[];
    let loggedErrors: jest.SpyInstance;
    let goTo: (path: string) => void;
    let currentAddress: string;

    beforeEach(() => {
        historyRequests = [];
        mockMapProps = undefined;

        global.fetch = jest.fn((url: string) => {
            const answer = (body: unknown) => ({ status: 200, ok: true, json: () => Promise.resolve(body) });
            if (url.endsWith('/history.json')) {
                return new Promise(resolve => {
                    historyRequests.push({ url, answer: () => resolve(answer({ history: [] })) });
                });
            }
            if (url.endsWith('/api/users/me')) {
                return Promise.resolve(answer(user));
            }
            if (url.endsWith('/uprns.json')) {
                return Promise.resolve(answer({ uprns: [] }));
            }
            if (url.endsWith('/planning_data.json')) {
                return Promise.resolve(answer({ data: [] }));
            }
            const buildingRead = url.match(/\/api\/buildings\/(\d+)\.json/);
            if (buildingRead) {
                return Promise.resolve(answer({ ...building, building_id: Number(buildingRead[1]) }));
            }
            // everything else the app reads while starting up; none of it matters to these tests
            return Promise.resolve(answer({}));
        }) as unknown as typeof fetch;

        loggedErrors = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    function app(): JSX.Element {
        return <App revisionId="1" user={user} building={building} user_verified={{}} />;
    }

    /** Opens the address in the browser, as a link followed inside the app would. */
    async function openInBrowser(address: string): Promise<void> {
        await act(async () => {
            ReactDOM.render(
                <MemoryRouter initialEntries={[address]}>
                    <Route render={({ history, location }) => {
                        goTo = history.push;
                        currentAddress = location.pathname + location.search;
                        return null;
                    }} />
                    {app()}
                </MemoryRouter>,
                container
            );
        });
    }

    /** Opens the address as a fresh page: the server's HTML, which the browser's script then takes over. */
    async function openFromServer(address: string): Promise<void> {
        container.innerHTML = renderToString(
            <StaticRouter location={address} context={{}}>{app()}</StaticRouter>
        );
        await act(async () => {
            ReactDOM.hydrate(<MemoryRouter initialEntries={[address]}>{app()}</MemoryRouter>, container);
        });
    }

    /** The category (or categories) shown in the building panel. */
    function shownCategories(): string[] {
        return Array.from(container.querySelectorAll('section.data-section'), section => section.id);
    }

    function isEditing(): boolean {
        return container.textContent.includes('Save edits');
    }

    async function click(selector: string): Promise<void> {
        const link = container.querySelector(selector);
        expect(link).not.toBeNull();
        await act(async () => {
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
        });
    }

    async function answerHistoryRequests(): Promise<void> {
        await act(async () => {
            historyRequests.forEach(request => request.answer());
        });
    }

    /** React's warning for an answer that arrived after the part of the page that asked for it had gone. */
    function stateUpdatesAfterRemoval(): unknown[][] {
        return loggedErrors.mock.calls.filter(call =>
            String(call[0]).includes('Can\'t perform a React state update on an unmounted component')
        );
    }

    test('a page from the server is taken over without switching category or warnings', async () => {
        await openFromServer('/view/location/1?sc=1');
        await answerHistoryRequests();

        expect(shownCategories()).toEqual(['location']);
        expect(historyRequests.map(request => request.url)).toEqual(['/api/buildings/1/history.json']);
        expect(loggedErrors).not.toHaveBeenCalled();
    });

    test('a page from the server in edit mode is taken over in edit mode', async () => {
        await openFromServer('/edit/age-history/1');

        expect(shownCategories()).toEqual(['age-history']);
        expect(isEditing()).toBe(true);
        expect(loggedErrors).not.toHaveBeenCalled();
    });

    test('clicking another category changes the address and the panel', async () => {
        await openInBrowser('/view/location/1');
        expect(shownCategories()).toEqual(['location']);

        await click('a.category-link[href="/view/age-history/1"]');

        expect(currentAddress).toBe('/view/age-history/1');
        expect(shownCategories()).toEqual(['age-history']);
    });

    test('Edit and View change the address and the mode', async () => {
        await openInBrowser('/view/age-history/1');
        expect(isEditing()).toBe(false);

        await click('a.icon-button.edit');

        expect(currentAddress).toBe('/edit/age-history/1');
        expect(shownCategories()).toEqual(['age-history']);
        expect(isEditing()).toBe(true);

        await click('a.icon-button.view');

        expect(currentAddress).toBe('/view/age-history/1');
        expect(isEditing()).toBe(false);
    });

    test('going to another address inside the app changes the panel', async () => {
        await openInBrowser('/view/age-history/1');

        await act(async () => goTo('/edit/location/1'));

        expect(shownCategories()).toEqual(['location']);
        expect(isEditing()).toBe(true);
    });

    test('clicking another building on the map keeps the category and mode in the address', async () => {
        await openInBrowser('/edit/location/1');

        await act(async () => mockMapProps.onBuildingAction({ building_id: 2 } as Building));

        expect(currentAddress).toBe('/edit/location/2');
        expect(shownCategories()).toEqual(['location']);
    });

    test('an edit history that arrives after its category was left is ignored without a warning', async () => {
        await openInBrowser('/view/location/1');
        expect(historyRequests).toHaveLength(1);

        await click('a.category-link[href="/view/age-history/1"]');
        await answerHistoryRequests();

        expect(shownCategories()).toEqual(['age-history']);
        expect(stateUpdatesAfterRemoval()).toEqual([]);
    });
});
