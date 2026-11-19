/**
 * A building edit refused by the API is shown to the person as a message on the edit form.
 * Tickets: docs/tickets/location-search/issues/04-gps-address-server-validation.md
 *          docs/tickets/location-search/issues/08-refused-edit-names-the-field.md
 *
 * The API's answer is faked here (no server, no database); its exact answer for a refused
 * GhanaPost GPS address, `{ error, field }`, is pinned by src/api/__tests__/api.test.ts.
 * When the answer names a field the form knows, the message says which field to check,
 * by the title the person sees; otherwise it is the API's message alone.
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
    /** What the faked API answers the edit with (HTTP 400) */
    let refusalAnswer: Record<string, unknown>;

    beforeEach(() => {
        // the API answers a refused edit with HTTP 400 and { error: <text> }, plus { field } when it is about one field
        refusalAnswer = { error: refusal };
        fetchMock = jest.fn((url: string, options: RequestInit) => Promise.resolve(
            options.method === 'POST' ?
                { status: 400, ok: false, json: () => Promise.resolve(refusalAnswer) } :
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

    /** Shows the form, makes the edit and saves it; returns the message on the form */
    async function saveRefusedEdit(): Promise<string> {
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

        return container.querySelector('[role="alert"].alert-danger').textContent;
    }

    test('shows the API\'s message on the form', async () => {
        expect(await saveRefusedEdit()).toBe(refusal);
    });

    test('names the refused field by the title the person sees on the form', async () => {
        refusalAnswer = { error: refusal, field: 'location_gps_address' };

        expect(await saveRefusedEdit()).toBe('Nothing was saved. Check "GhanaPost GPS address": Invalid format of data sent');
    });

    test('shows the API\'s message alone when the browser has no title for the field it names', async () => {
        refusalAnswer = { error: refusal, field: 'not_a_field_the_browser_knows' };

        const message = await saveRefusedEdit();

        expect(message).toBe(refusal);
        expect(message).not.toContain('not_a_field_the_browser_knows');
    });
});
