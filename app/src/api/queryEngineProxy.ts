/*
 * Implements FR-1.4, FR-14.1 (spec user story 77); see ADR-0019, ADR-0017, ADR-0011.
 * Ticket: docs/tickets/query-engine/issues/18-connect-colouring-ghana-to-engine.md
 *
 * Forwards the app's route /api/query/* to the query engine, a separate service
 * (github.com/GeorgeAgyenim/ccrp-query-engine), with the /api/query prefix removed:
 * /api/query/v1/run on the app is /v1/run on the engine. Bodies are passed through as they
 * are, never read or logged here: a plan can hold the area a person is looking at.
 */
import express from 'express';
import http from 'http';
import { pipeline } from 'stream';

import { logErrorSafely } from './logError';

/**
 * The only request headers sent on. Cookies, credentials and the person's address and browser
 * stay with the app: the engine has no use for them (ADR-0011).
 */
const REQUEST_HEADERS = ['accept', 'content-type', 'content-length', 'transfer-encoding'];

/**
 * The engine's answer headers that are not passed back: those that belong to one connection, not to the
 * answer (RFC 9110, 7.6.1), and a cookie, which the engine has no business setting on the platform's site.
 */
const ANSWER_HEADERS_KEPT_BACK = new Set([
    'connection', 'keep-alive', 'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'set-cookie'
]);

function pick(headers: http.IncomingHttpHeaders, names: string[]): http.OutgoingHttpHeaders {
    const picked: http.OutgoingHttpHeaders = {};
    for (const name of names) {
        if (headers[name] !== undefined) {
            picked[name] = headers[name];
        }
    }
    return picked;
}

/** The app's own answers, in the shape of the engine's error answers. */
function answerError(res: express.Response, status: number, error: string): void {
    res.status(status).json({ error });
}

/**
 * How long the engine may go without sending anything before the browser is told it took too long:
 * 60 s, as nginx's proxy_read_timeout. The engine stops its own queries after its statement timeout
 * (10 s by default), so only an engine that has stopped working reaches this.
 */
const ENGINE_TIMEOUT_MS = 60_000;

class EngineTimeout extends Error {
    name = 'EngineTimeout';
}

/**
 * Forward each request to the engine at `engineUrl`, and its answer back.
 * Mount it with `server.use('/api/query', ...)` before the API router, which would read the body.
 * With no `engineUrl`, every request is answered 503.
 */
export function queryEngineProxy(engineUrl: string | undefined, { timeoutMs = ENGINE_TIMEOUT_MS } = {}): express.RequestHandler {
    if (engineUrl === undefined) {
        console.warn('ANALYSE_ENGINE_URL is not set: /api/query will answer that the query engine is not set up');
        return (req, res) => answerError(res, 503, 'The query engine is not set up on this server.');
    }

    const target = engineAddress(engineUrl);
    const basePath = target.pathname.replace(/\/$/, '');

    return (req, res) => {
        let answerClosedEarly = false;

        const toEngine = http.request({
            // an IPv6 address is written in brackets in a URL, but not in a request's hostname
            hostname: target.hostname.replace(/^\[(.*)\]$/, '$1'),
            port: target.port,
            method: req.method,
            path: basePath + req.url,
            headers: pick(req.headers, REQUEST_HEADERS),
            timeout: timeoutMs
        }, fromEngine => {
            res.status(fromEngine.statusCode ?? 502);
            for (const [name, value] of Object.entries(fromEngine.headers)) {
                if (value !== undefined && !ANSWER_HEADERS_KEPT_BACK.has(name)) {
                    res.setHeader(name, value);
                }
            }
            // An answer the engine cuts off part-way is cut off for the browser too, not ended as if whole,
            // and a browser that gives up stops the engine's answer. Nothing is logged: the engine logs its own
            // failures, and a browser giving up is not one.
            pipeline(fromEngine, res, () => undefined);
        });

        toEngine.on('timeout', () => toEngine.destroy(new EngineTimeout()));

        toEngine.on('error', error => {
            if (answerClosedEarly) {
                // the browser gave up and the request was closed below: nothing failed at the engine
                return;
            }
            // the error's message names the engine's address; logErrorSafely logs its code, not its message
            logErrorSafely('Query engine route, the engine did not answer:', error);
            if (res.headersSent) {
                res.destroy();
            } else if (error instanceof EngineTimeout) {
                answerError(res, 504, 'The query engine took too long to answer. Try again later.');
            } else {
                answerError(res, 502, 'The query engine is not answering. Try again later.');
            }
        });

        // when the browser gives up before the answer is complete, so does the request to the engine
        res.on('close', () => {
            if (!res.writableFinished) {
                answerClosedEarly = true;
                toEngine.destroy();
            }
        });

        req.pipe(toEngine);
    };
}

/** The engine's address as a URL, or a plain reason the server cannot start. */
function engineAddress(engineUrl: string): URL {
    const problem = 'ANALYSE_ENGINE_URL must be an http:// address, such as http://127.0.0.1:3100';
    let url: URL;
    try {
        url = new URL(engineUrl);
    } catch {
        throw new Error(problem);
    }
    if (url.protocol !== 'http:') {
        throw new Error(problem);
    }
    return url;
}
