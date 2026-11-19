/**
 * @jest-environment node
 */
/*
 * Password-reset emails are sent from the address in MAIL_FROM, or from the mail server account
 * (MAIL_SERVER_USER) when MAIL_FROM is not set, instead of a fixed London address.
 * Ticket: docs/tickets/location-search/issues/20-privacy-policy-and-contact-page.md
 */
import { getPasswordResetEmail } from '../passwordReset';

const mailSettings = ['MAIL_FROM', 'MAIL_SERVER_USER'];
let settingsBeforeTest: { [name: string]: string | undefined };

beforeEach(() => {
    settingsBeforeTest = {};
    mailSettings.forEach(name => { settingsBeforeTest[name] = process.env[name]; });
});

afterEach(() => {
    mailSettings.forEach(name => {
        if (settingsBeforeTest[name] === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = settingsBeforeTest[name];
        }
    });
});

function passwordResetEmail() {
    return getPasswordResetEmail('person@example.org', 'a-token', 'https://example.org');
}

describe('the password-reset email', () => {
    test('is sent from MAIL_FROM when it is set', () => {
        process.env.MAIL_FROM = 'sender@example.org';
        process.env.MAIL_SERVER_USER = 'account@example.org';

        expect(passwordResetEmail().from).toBe('sender@example.org');
    });

    test('is sent from the mail server account when MAIL_FROM is not set', () => {
        delete process.env.MAIL_FROM;
        process.env.MAIL_SERVER_USER = 'account@example.org';

        expect(passwordResetEmail().from).toBe('account@example.org');
    });

    test('is sent from the mail server account when MAIL_FROM is empty', () => {
        process.env.MAIL_FROM = '';
        process.env.MAIL_SERVER_USER = 'account@example.org';

        expect(passwordResetEmail().from).toBe('account@example.org');
    });

    test('is not built at all when no sender is configured, with an error that says what to set', () => {
        delete process.env.MAIL_FROM;
        delete process.env.MAIL_SERVER_USER;

        expect(() => passwordResetEmail()).toThrow('set MAIL_FROM');
    });

    test('still goes to the person who asked for it', () => {
        process.env.MAIL_FROM = 'sender@example.org';

        expect(passwordResetEmail().to).toBe('person@example.org');
    });
});
