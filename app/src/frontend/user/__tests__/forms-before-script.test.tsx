/**
 * The account forms never put what a person typed into the address.
 * Until the page's script has loaded, a form is plain HTML: without method="POST" a submit is a GET,
 * and the browser writes every field (the password included) into the address. With method="POST" and
 * no action, an early submit posts to the page's own address and the server shows the page again.
 * The forms are read from the HTML the server would send (the whole app, as src/frontendRoute.tsx renders it).
 * Ticket: docs/tickets/location-search/issues/10-forms-submitted-before-the-script-loads.md
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { App } from '../../app';
import { User } from '../../models/user';

const loggedInUser = {
    username: 'test-user',
    email: 'test-user@example.org',
    registered: new Date(0),
    api_key: 'test-key'
} as User;

/** The forms on the page at the given address, as the server sends it. */
function formsAt(address: string, user?: User): HTMLFormElement[] {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
        <StaticRouter location={address} context={{}}>
            <App user={user} revisionId="0" />
        </StaticRouter>
    );
    return Array.from(page.querySelectorAll('form'));
}

/** Names of the fields a plain submit of the form would send. */
function fieldNames(form: HTMLFormElement): string[] {
    return Array.from(form.querySelectorAll('[name]')).map(field => field.getAttribute('name'));
}

/** The HTML attribute is not case-sensitive; React writes it as given. */
function method(form: HTMLFormElement): string | null {
    const value = form.getAttribute('method');
    return value == undefined ? null : value.toLowerCase();
}

describe('account forms, as the server sends them', () => {
    test.each([
        ['log-in', '/login.html', ['username', 'password']],
        ['sign-up', '/sign-up.html', ['username', 'email', 'confirm_email', 'password']],
        ['forgotten-password', '/forgotten-password.html', ['email']],
        ['password-reset', '/password-reset.html?token=abc', ['password', 'confirmPassword', 'token']],
    ])('the %s form is sent by POST to the page\'s own address', (name, address, sensitiveFields) => {
        const forms = formsAt(address);

        expect(forms).toHaveLength(1);
        expect(fieldNames(forms[0])).toEqual(expect.arrayContaining(sensitiveFields));
        expect(method(forms[0])).toBe('post');
        expect(forms[0].hasAttribute('action')).toBe(false);
    });

    test('the log out, API key and delete account forms on the account page are sent by POST to the page\'s own address', () => {
        const forms = formsAt('/my-account.html', loggedInUser);

        expect(forms.map(form => form.querySelector('input[type="submit"]').getAttribute('value')))
            .toEqual(['Log out', 'Generate API key', 'Delete account']);
        for (const form of forms) {
            expect(method(form)).toBe('post');
            expect(form.hasAttribute('action')).toBe(false);
        }
    });
});
