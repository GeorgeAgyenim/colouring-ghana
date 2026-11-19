/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/04-gps-address-server-validation.md
 *
 * What the API answers when a building edit is refused because of the GhanaPost
 * GPS address. The answer's `error` text is what the edit form shows the person.
 * The real API router is used, over HTTP on a local port.
 * A refused edit never reaches the database; the transaction is replaced so a
 * mistake here cannot reach one either.
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';

import apiRouter from '../api';

jest.mock('../dataAccess/transaction', () => ({
    startUpdateTransaction: () => {
        throw new Error('This test must not reach the database');
    }
}));

function postJson(port: number, path: string, body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
        const request = http.request(
            { host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json' } },
            response => {
                let text = '';
                response.on('data', chunk => text += chunk);
                response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(text) }));
            }
        );
        request.on('error', reject);
        request.end(JSON.stringify(body));
    });
}

describe('POST /api/buildings/:building_id.json with a GhanaPost GPS address the API refuses', () => {
    let server: http.Server;

    function editBuilding(attributes: Record<string, unknown>) {
        const port = (server.address() as AddressInfo).port;
        return postJson(port, '/api/buildings/1.json', { attributes });
    }

    beforeAll(() => {
        const app = express();
        // stand in for the session middleware of server.tsx: a logged-in person
        app.use((req, res, next) => {
            req.session = { user_id: 'test-user' } as typeof req.session;
            next();
        });
        app.use('/api', apiRouter);
        return new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
    });

    afterAll(() => new Promise(resolve => server.close(resolve)));

    beforeEach(() => {
        // the API logs every refusal; keep the test output readable
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('answers a badly formatted address with the normal invalid-field 400', async () => {
        const response = await editBuilding({ location_gps_address: 'hello' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Invalid format of data sent'
        });
    });

    it('answers an address too long for the database with the same 400, not a server error', async () => {
        const response = await editBuilding({ location_gps_address: 'GA-183-9385-00000000' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Invalid format of data sent'
        });
    });
});
