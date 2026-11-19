/**
 * Pasting copied values onto a building by clicking it on the map tells the person what happened.
 * Ticket: docs/tickets/location-search/issues/09-paste-onto-buildings-shows-the-result.md
 *
 * The whole app is rendered, signed in, on the paste page. Two things are faked:
 * - the Leaflet map (it cannot be loaded here): a stand-in records the click callback the app
 *   gives the map, and each test calls it the way the real map does after a click;
 * - the API (no server, no database): each paste request waits until the test answers it, so
 *   a test can decide the order in which answers arrive.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router-dom';

import { App } from '../../app';
import { Building } from '../../models/building';

/**
 * What the app gives the map. The map calls `onBuildingAction` with the clicked building, or
 * `onBuildingLookupFailed` when it could not find out which building was clicked.
 */
let mockMapProps: {
    mode: string;
    onBuildingAction: (building: Building) => void;
    onBuildingLookupStarted?: () => void;
    onBuildingLookupFailed?: () => void;
};

jest.mock('../../map/map', () => ({
    ColouringMap: (props) => {
        mockMapProps = props;
        return null;
    }
}));

/** A paste request the app has sent and the test has not answered yet. */
interface SentPaste {
    url: string;
    body: Record<string, unknown>;
    apiAnswers: (status: number, body: Record<string, unknown>) => void;
    requestFails: () => void;
}

const copiedValues = { date_year: 1990 };
const pastePage = `/multi-edit/age-history?data=${encodeURIComponent(JSON.stringify(copiedValues))}`;

const connectionMessage = 'The building you clicked was not changed: could not reach the server. ' +
    'Check your connection and click the building again.';

describe('pasting copied values onto buildings', () => {
    const originalFetch = global.fetch;

    let container: HTMLDivElement;
    let sentPastes: SentPaste[];
    let goTo: (path: string) => void;

    beforeEach(async () => {
        sentPastes = [];
        mockMapProps = undefined;

        global.fetch = jest.fn((url: string, options: RequestInit) => {
            if (options.method !== 'POST') {
                // everything the app reads while starting up; none of it matters to these tests
                const body = url.endsWith('/api/users/me') ? { username: 'tester' } : {};
                return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(body) });
            }
            return new Promise((resolve, reject) => {
                sentPastes.push({
                    url,
                    body: JSON.parse(options.body as string),
                    apiAnswers: (status, body) => resolve({
                        status,
                        ok: status < 400,
                        json: () => Promise.resolve(body)
                    }),
                    // what fetch does when there is no connection
                    requestFails: () => reject(new TypeError('Failed to fetch'))
                });
            });
        }) as unknown as typeof fetch;

        // errors shown to the person are also written to the console; keep the test output readable
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            ReactDOM.render(
                <MemoryRouter initialEntries={[pastePage]}>
                    <Route render={({ history }) => { goTo = history.push; return null; }} />
                    <App revisionId="1" user={{ username: 'tester' }} />
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
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    /** The map found this building under the click; `undefined` is a click on empty ground. */
    async function clickBuilding(buildingId: number | undefined): Promise<void> {
        await act(async () => {
            mockMapProps.onBuildingAction(
                buildingId == undefined ? undefined : { building_id: buildingId } as Building
            );
        });
    }

    async function apiAnswers(paste: SentPaste, status: number, body: Record<string, unknown>): Promise<void> {
        await act(async () => {
            paste.apiAnswers(status, body);
        });
    }

    async function requestFails(paste: SentPaste): Promise<void> {
        await act(async () => {
            paste.requestFails();
        });
    }

    /** The polite message (read out by a screen reader when it appears), or '' when there is none. */
    function statusMessage(): string {
        return container.querySelector('[role="status"]')?.textContent ?? '';
    }

    /** The error message (read out by a screen reader at once), or '' when there is none. */
    function errorMessage(): string {
        return container.querySelector('[role="alert"].alert-danger')?.textContent ?? '';
    }

    test('the paste page is shown, with no result message before the first click', () => {
        expect(mockMapProps.mode).toBe('multi-edit');
        expect(container.querySelector('h2').textContent).toBe('Paste age-history data');
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');
    });

    test('a successful paste shows "Building updated."', async () => {
        await clickBuilding(7);

        expect(sentPastes).toHaveLength(1);
        expect(sentPastes[0].url).toMatch(/\/api\/buildings\/7\.json$/);
        expect(sentPastes[0].body).toEqual({ attributes: copiedValues, user_attributes: {} });

        await apiAnswers(sentPastes[0], 200, { revision_id: '2', attributes: copiedValues });

        expect(statusMessage()).toBe('Building updated.');
        expect(errorMessage()).toBe('');
    });

    test('a paste the API refuses shows that the building was not changed, with the API\'s reason', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 400, { error: 'Invalid format of data sent' });

        expect(errorMessage()).toBe('The building you clicked was not changed: Invalid format of data sent');
        expect(statusMessage()).toBe('');
    });

    // docs/tickets/location-search/issues/08-refused-edit-names-the-field.md: the panel shows the same
    // message as the edit form, which names the refused field by its title
    test('a paste the API refuses because of one field names that field by its title', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 400, { error: 'Invalid format of data sent', field: 'date_year' });

        expect(errorMessage()).toBe('The building you clicked was not changed: ' +
            'Nothing was saved. Check "Year construction started (best estimate)": Invalid format of data sent');
        expect(statusMessage()).toBe('');
    });

    test('a paste after the login has run out shows the API\'s "Must be logged in"', async () => {
        await clickBuilding(7);
        // the API answers this one with HTTP 200
        await apiAnswers(sentPastes[0], 200, { error: 'Must be logged in' });

        expect(errorMessage()).toBe('The building you clicked was not changed: Must be logged in');
        expect(statusMessage()).toBe('');
    });

    test('a building that already has the values shows "That building already has these values."', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 400, { error: 'No change provided' });

        expect(statusMessage()).toBe('That building already has these values.');
        expect(errorMessage()).toBe('');
    });

    test('a request that fails shows the connection message', async () => {
        await clickBuilding(7);
        await requestFails(sentPastes[0]);

        expect(errorMessage()).toBe(connectionMessage);
        expect(statusMessage()).toBe('');
    });

    test('a click whose building could not be looked up shows the connection message', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 200, { revision_id: '2' });
        expect(statusMessage()).toBe('Building updated.');

        await act(async () => {
            mockMapProps.onBuildingLookupFailed();
        });

        expect(errorMessage()).toBe(connectionMessage);
        expect(statusMessage()).toBe('');
        expect(sentPastes).toHaveLength(1);
    });

    test('the message is cleared as soon as the map says the next click has started', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 200, { revision_id: '2' });
        expect(statusMessage()).toBe('Building updated.');

        await act(async () => {
            mockMapProps.onBuildingLookupStarted();
        });

        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');
    });

    test('the message is cleared when the next click starts', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 200, { revision_id: '2', attributes: copiedValues });
        expect(statusMessage()).toBe('Building updated.');

        await clickBuilding(8);
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');

        await apiAnswers(sentPastes[1], 400, { error: 'Invalid format of data sent' });
        expect(errorMessage()).toBe('The building you clicked was not changed: Invalid format of data sent');

        await clickBuilding(9);
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');
    });

    test('when an earlier click finishes after a later one, the later click\'s message stays', async () => {
        await clickBuilding(7);
        await clickBuilding(8);
        expect(sentPastes).toHaveLength(2);

        await apiAnswers(sentPastes[1], 200, { revision_id: '2', attributes: copiedValues });
        expect(statusMessage()).toBe('Building updated.');

        await apiAnswers(sentPastes[0], 400, { error: 'Invalid format of data sent' });
        expect(statusMessage()).toBe('Building updated.');
        expect(errorMessage()).toBe('');
    });

    test('an earlier click that finishes while a later one is still waiting shows nothing', async () => {
        await clickBuilding(7);
        await clickBuilding(8);

        await apiAnswers(sentPastes[0], 200, { revision_id: '2', attributes: copiedValues });
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');

        await requestFails(sentPastes[1]);
        expect(errorMessage()).toBe(connectionMessage);
        expect(statusMessage()).toBe('');
    });

    test('a click on empty ground sends nothing and clears the message', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 200, { revision_id: '2', attributes: copiedValues });
        expect(statusMessage()).toBe('Building updated.');

        await clickBuilding(undefined);

        expect(sentPastes).toHaveLength(1);
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');
    });

    test('the message is gone after leaving the paste page and coming back', async () => {
        await clickBuilding(7);
        await apiAnswers(sentPastes[0], 200, { revision_id: '2', attributes: copiedValues });
        expect(statusMessage()).toBe('Building updated.');

        await act(async () => {
            goTo('/edit/age-history');
        });
        expect(mockMapProps.mode).toBe('edit');

        await act(async () => {
            goTo(pastePage);
        });
        expect(mockMapProps.mode).toBe('multi-edit');
        expect(container.querySelector('h2').textContent).toBe('Paste age-history data');
        expect(statusMessage()).toBe('');
        expect(errorMessage()).toBe('');
    });
});
