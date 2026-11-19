/**
 * A building edit refused by the API is shown to the person as a message on the edit form.
 * Ticket: docs/tickets/location-search/issues/04-gps-address-server-validation.md
 *
 * The API's answer is faked here (no server, no database); its exact text for a refused
 * GhanaPost GPS address is pinned by src/api/__tests__/api.test.ts.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import withCopyEdit from '../data-container';
import { CategoryViewProps } from '../data-containers/category-view-props';
import { Building } from '../../models/building';

const refusal = 'Invalid format of data sent';

/** Stands in for a category form: one button that makes the edit a person would type. */
const OneEditView: React.FC<CategoryViewProps> = (props) => (
    <button type="button" id="make-edit" onClick={() => props.onChange('location_gps_address', 'HELLO')}>
        Make edit
    </button>
);
const EditForm = withCopyEdit(OneEditView);

describe('edit form, when the API refuses the edit', () => {
    const originalFetch = global.fetch;

    let container: HTMLDivElement;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        // the API answers a refused edit with HTTP 400 and { error: <text> }
        fetchMock = jest.fn((url: string, options: RequestInit) => Promise.resolve(
            options.method === 'POST' ?
                { status: 400, ok: false, json: () => Promise.resolve({ error: refusal }) } :
                { status: 200, ok: true, json: () => Promise.resolve({ history: [] }) }
        ));
        global.fetch = fetchMock as unknown as typeof fetch;

        // the error box also writes the message to the console; keep the test output readable
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

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

    test('shows the API\'s message on the form', async () => {
        const building = { building_id: 1, revision_id: 1, location_gps_address: null } as unknown as Building;

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
                        onUserVerifiedUpdate={jest.fn()}
                        mapColourScale={undefined}
                        onMapColourScale={jest.fn()}
                    />
                </MemoryRouter>,
                container
            );
        });
        expect(container.querySelector('[role="alert"].alert-danger')).toBeNull();

        act(() => {
            container.querySelector<HTMLButtonElement>('#make-edit').click();
        });
        await act(async () => {
            container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        const [url, options] = fetchMock.mock.calls.find(([, callOptions]) => callOptions.method === 'POST');
        expect(url).toMatch(/\/api\/buildings\/1\.json$/);
        expect(JSON.parse(options.body)).toEqual({
            attributes: { location_gps_address: 'HELLO' },
            user_attributes: {}
        });

        expect(container.querySelector('[role="alert"].alert-danger').textContent).toBe(refusal);
    });
});
