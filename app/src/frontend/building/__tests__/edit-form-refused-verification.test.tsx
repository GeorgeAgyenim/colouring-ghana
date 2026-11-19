/**
 * A verification refused by the API is shown to the person as a message on the edit form.
 * Ticket: docs/tickets/location-search/issues/07-server-log-holds-what-people-typed.md
 *
 * The API's answer is faked here (no server, no database); its exact text and its HTTP 400
 * for each kind of refusal are pinned by src/api/__tests__/log-privacy.test.ts.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import withCopyEdit from '../data-container';
import { CategoryViewProps } from '../data-containers/category-view-props';
import { Building } from '../../models/building';

const refusal = 'The value sent does not match the saved value, so it was not verified. Reload the building and try again.';

/** Stands in for a category form: buttons that do what the Verify button of a field does. */
const OneVerifyView: React.FC<CategoryViewProps> = (props) => (
    <>
        <button type="button" id="verify" onClick={() => props.onVerify('location_name', true, 0, 0)}>
            Verify
        </button>
        <button type="button" id="verify-land-use" onClick={() => props.onVerify('current_landuse_group', true, 0, 0)}>
            Verify land use
        </button>
    </>
);
const EditForm = withCopyEdit(OneVerifyView);

describe('edit form, when the API refuses a verification', () => {
    const originalFetch = global.fetch;

    let container: HTMLDivElement;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        // the API answers a refused verification with HTTP 400 and { error: <text> }
        fetchMock = jest.fn((url: string, options: RequestInit) => Promise.resolve(
            options.method === 'POST' ?
                { status: 400, ok: false, json: () => Promise.resolve({ error: refusal }) } :
                { status: 200, ok: true, json: () => Promise.resolve({ history: [] }) }
        ));
        global.fetch = fetchMock as unknown as typeof fetch;

        // the error box also writes the message to the browser's console; keep the test output readable
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);

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

    test('shows the API\'s message on the form and does not record a verification', async () => {
        const building = { building_id: 1, revision_id: 1, location_name: 'Akosua Kitchen' } as unknown as Building;
        const onUserVerifiedUpdate = jest.fn();

        await act(async () => {
            ReactDOM.render(
                <MemoryRouter>
                    <EditForm
                        title="Location"
                        cat="location"
                        intro=""
                        help=""
                        mode="edit"
                        building={building}
                        user_verified={{}}
                        onBuildingUpdate={jest.fn()}
                        onUserVerifiedUpdate={onUserVerifiedUpdate}
                        mapColourScale={undefined}
                        onMapColourScale={jest.fn()}
                    />
                </MemoryRouter>,
                container
            );
        });
        expect(container.querySelector('[role="alert"].alert-danger')).toBeNull();

        await act(async () => {
            container.querySelector<HTMLButtonElement>('#verify').click();
        });

        const [url, options] = fetchMock.mock.calls.find(([, callOptions]) => callOptions.method === 'POST');
        expect(url).toMatch(/\/api\/buildings\/1\/verify\.json$/);
        expect(JSON.parse(options.body)).toEqual({ location_name: 'Akosua Kitchen' });

        expect(container.querySelector('[role="alert"].alert-danger').textContent).toBe(refusal);
        expect(onUserVerifiedUpdate).not.toHaveBeenCalled();
    });

    test('for current land use, the message stays and nothing is saved as verified', async () => {
        // Verifying current land use also saves "current_landuse_verified". A refused verification must
        // not save it, and must not clear the message by starting that save.
        const building = {
            building_id: 1, revision_id: 1, current_landuse_group: ['Offices']
        } as unknown as Building;

        await act(async () => {
            ReactDOM.render(
                <MemoryRouter>
                    <EditForm
                        title="Land use"
                        cat="land-use"
                        intro=""
                        help=""
                        mode="edit"
                        building={building}
                        user_verified={{}}
                        onBuildingUpdate={jest.fn()}
                        onUserVerifiedUpdate={jest.fn()}
                        mapColourScale={undefined}
                        onMapColourScale={jest.fn()}
                    />
                </MemoryRouter>,
                container
            );
        });

        await act(async () => {
            container.querySelector<HTMLButtonElement>('#verify-land-use').click();
        });

        const posts = fetchMock.mock.calls.filter(([, callOptions]) => callOptions.method === 'POST');
        expect(posts).toHaveLength(1);
        expect(posts[0][0]).toMatch(/\/verify\.json$/);
        expect(container.querySelector('[role="alert"].alert-danger').textContent).toBe(refusal);
    });
});
