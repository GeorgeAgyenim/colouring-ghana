/**
 * Server-side Express application
 * - API methods
 * - entry-point to shared React App
 *
 */
import pgConnect from 'connect-pg-simple';
import express from 'express';
import session from 'express-session';
import http from 'http';

import apiServer from './api/api';
import { logErrorSafely } from './api/logError';
import db from './db';
import frontendRoute from './frontendRoute';
import tileserver from './tiles/tileserver';

// create server
const server = express();

// disable header
server.disable('x-powered-by');

// serve static files
const publicDir = process.env.RAZZLE_PUBLIC_DIR;
if (publicDir == undefined) {
    throw new Error('RAZZLE_PUBLIC_DIR is not set');
}
server.use(express.static(publicDir));

// handle user sessions
const pgSession = pgConnect(session);
const sess: any = { // TODO: remove any
    name: 'cl.session',
    store: new pgSession({
        pgPromise: db,
        tableName: 'user_sessions'
    }),
    secret: process.env.APP_COOKIE_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
};
if (server.get('env') === 'production') {
    // trust first proxy
    server.set('trust proxy', 1);
    // serve secure cookies
    sess.cookie.secure = true;
}
server.use(session(sess));

server.use('/tiles', tileserver);
server.use('/api', apiServer);
server.use(frontendRoute);

// The last error handler: errors from the session store, the tile server and the page route end here.
// Express's own handler would print the error's stack, which starts with its message, so it is never reached.
// An error made for a bad request (e.g. an address that cannot be decoded) keeps its 4xx status.
// Express treats a handler as an error handler only when it takes four arguments, so `next` stays.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
server.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logErrorSafely('Server error handler:', err);

    if (res.headersSent) {
        // the answer has started and cannot be replaced, so the connection is closed
        req.socket?.destroy();
        return;
    }

    const { status } = (err ?? {}) as { status?: unknown };
    const answerStatus = (typeof status === 'number' && status >= 400 && status < 500) ? status : 500;
    res.status(answerStatus).type('text/plain').send(http.STATUS_CODES[answerStatus]);
});

export default server;
