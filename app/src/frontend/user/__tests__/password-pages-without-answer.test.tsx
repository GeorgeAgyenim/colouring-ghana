/**
 * The forgotten-password and password-reset pages say what failed when their request gets no answer.
 * Ticket: docs/tickets/location-search/issues/17-small-error-and-page-fixes.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router-dom';

import ForgottenPassword from '../forgotten-password';
import PasswordReset from '../password-reset';

describe('password pages whose request gets no answer', () => {
    const originalFetch = global.fetch;
    let container: HTMLDivElement;

    beforeEach(() => {
        // no connection: the browser's fetch fails before any answer
        global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
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

    /** Types a value into a field the way React notices it. */
    function type(name: string, value: string): void {
        const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        act(() => {
            setValue.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    async function submit(): Promise<void> {
        await act(async () => {
            container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
    }

    function shownError(): string {
        return container.querySelector('[role="alert"].alert-danger')?.textContent ?? '';
    }

    test('forgotten password says the reset email could not be requested', async () => {
        act(() => {
            ReactDOM.render(<MemoryRouter><ForgottenPassword /></MemoryRouter>, container);
        });
        type('email', 'person@example.org');

        await submit();

        expect(shownError()).toBe('Could not request a password reset. Check your connection and try again.');
    });

    test('password reset says the password could not be changed, instead of failing silently', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        act(() => {
            ReactDOM.render(
                <MemoryRouter initialEntries={['/password-reset.html?token=a-token']}>
                    <Route path="/password-reset.html" component={PasswordReset} />
                </MemoryRouter>,
                container
            );
        });
        type('password', 'a-long-enough-password');
        type('confirmPassword', 'a-long-enough-password');

        await submit();

        expect(shownError()).toBe('Could not change the password. Check your connection and try again.');
    });
});
