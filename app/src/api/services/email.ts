import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER_HOST,
    port: process.env.MAIL_SERVER_PORT == undefined ? undefined : parseInt(process.env.MAIL_SERVER_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_SERVER_USER,
        pass: process.env.MAIL_SERVER_PASSWORD
    }
});

/**
 * The address emails are sent from: MAIL_FROM if it is set, otherwise the mail server account.
 * It is read each time an email is built.
 * Ticket: docs/tickets/location-search/issues/20-privacy-policy-and-contact-page.md
 */
function senderAddress(): string {
    const sender = process.env.MAIL_FROM || process.env.MAIL_SERVER_USER;
    if (!sender) {
        // without a sender the mail server either refuses the email or it lands as spam; say so plainly
        throw new Error('No sender address for emails: set MAIL_FROM (or MAIL_SERVER_USER)');
    }
    return sender;
}

export {
    transporter,
    senderAddress
};
