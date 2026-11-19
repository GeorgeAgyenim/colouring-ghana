/**
 * An account request that gets no answer (no connection, or an answer that is not the API's) says what
 * failed, on the page where the person asked for it. Each action has its own message; before, deleting
 * the account said "Error getting API key.", copied from the API-key action.
 * Ticket: docs/tickets/location-search/issues/17-small-error-and-page-fixes.md
 *
 * The real pages are shown inside the real AuthProvider. The network is faked: the request under test
 * fails as fetch fails when there is no connection; every other request gets the API's usual answer.
 * A refusal the API does answer keeps the API's own message (not tested here: it is unchanged).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '../../auth-context';
import { User } from '../../models/user';
import { Login } from '../login';
import { MyAccountPage } from '../my-account';
import { SignUp } from '../signup';

const signedInUser = {
    username: 'kwame_mensah',
    email: 'kwame@example.org',
    registered: new Date(0),
    api_key: 'test-key'
} as User;

const OLD_COPIED_MESSAGE = 'Error getting API key.';

describe('account requests that get no answer', () => {
    const originalFetch = global.fetch;

    let container: HTMLDivElement;
    /** The request, as "METHOD /path", that fails as if there were no connection */
    let failingRequest: string;
    /** What the API answers when the page asks for the signed-in account */
    let accountAnswer: User;

    /** A request as "METHOD /path", without the site's sub-path */
    function requestOf(url: string, options: RequestInit): string {
        return `${options.method} ${url.replace(process.env.SUBDIRECTORY ?? '', '')}`;
    }

    beforeEach(() => {
        global.fetch = jest.fn((url: string, options: RequestInit) => {
            const request = requestOf(url, options);
            if (request === failingRequest) {
                return Promise.reject(new TypeError('Failed to fetch'));
            }
            // the API's answer when the request works
            const answer = request === 'GET /api/users/me' ? accountAnswer : { success: true };
            return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(answer) });
        }) as unknown as typeof fetch;

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

    async function show(page: React.ReactElement, user?: User) {
        accountAnswer = user ?? { error: 'Must be logged in' };
        await act(async () => {
            ReactDOM.render(
                <AuthProvider preloadedUser={user}>
                    <MemoryRouter>{page}</MemoryRouter>
                </AuthProvider>,
                container
            );
        });
    }

    async function submitForm(buttonText: string) {
        const button = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="submit"]'))
            .find(input => input.value === buttonText);
        await act(async () => {
            button.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
    }

    function shownMessage(): string | undefined {
        return container.querySelector('[role="alert"].alert-danger')?.textContent;
    }

    async function logIn(): Promise<string> {
        failingRequest = 'POST /api/login';
        await show(<Login />);
        await submitForm('Log In');
        return shownMessage();
    }

    async function signUp(): Promise<string> {
        failingRequest = 'POST /api/users';
        await show(<SignUp />);
        await submitForm('Sign Up');
        return shownMessage();
    }

    async function loadAccount(): Promise<string> {
        failingRequest = 'GET /api/users/me';
        await show(<MyAccountPage />, signedInUser);
        return shownMessage();
    }

    async function logOut(): Promise<string> {
        failingRequest = 'POST /api/logout';
        await show(<MyAccountPage />, signedInUser);
        await submitForm('Log out');
        return shownMessage();
    }

    async function createApiKey(): Promise<string> {
        failingRequest = 'POST /api/api/key';
        await show(<MyAccountPage />, signedInUser);
        await submitForm('Generate API key');
        return shownMessage();
    }

    async function deleteAccount(): Promise<string> {
        failingRequest = 'DELETE /api/users/me';
        await show(<MyAccountPage />, signedInUser);
        await submitForm('Delete account');
        const confirm = Array.from(container.querySelectorAll<HTMLButtonElement>('.modal-footer button'))
            .find(button => button.textContent === 'Delete account');
        await act(async () => {
            confirm.click();
        });
        return shownMessage();
    }

    test.each([
        ['logging in', logIn, 'Could not log in. Check your connection and try again.'],
        ['signing up', signUp, 'Could not sign up. Check your connection and try again.'],
        ['loading the account', loadAccount, 'Could not load your account details. Check your connection and try again.'],
        ['logging out', logOut, 'Could not log out. Check your connection and try again.'],
        ['creating an API key', createApiKey, 'Could not create a new API key. Check your connection and try again.'],
        ['deleting the account', deleteAccount, 'Could not delete the account. Check your connection and try again.']
    ])('%s shows what failed', async (action, perform, message) => {
        expect(shownMessage()).toBeUndefined();

        expect(await perform()).toBe(message);
        expect((global.fetch as jest.Mock).mock.calls.map(([url, options]) => requestOf(url, options)))
            .toContain(failingRequest);
    });

    // the message says to try again, so the button that sends the form must work again
    test.each([
        ['log-in', logIn, 'Log In'],
        ['sign-up', signUp, 'Sign Up']
    ])('the %s form can be sent again after its request failed', async (form, perform, buttonText) => {
        await perform();

        expect(container.querySelector<HTMLInputElement>(`input[value="${buttonText}"]`).disabled).toBe(false);
    });

    test('no action shows the message copied from the API-key action, and no two share a message', async () => {
        const messages: string[] = [];
        for (const action of [logIn, signUp, loadAccount, logOut, createApiKey, deleteAccount]) {
            messages.push(await action());
            act(() => {
                ReactDOM.unmountComponentAtNode(container);
            });
        }

        expect(messages).not.toContain(OLD_COPIED_MESSAGE);
        expect(new Set(messages).size).toBe(messages.length);
    });
});
