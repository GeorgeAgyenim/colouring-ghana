/**
 * @jest-environment node
 */
/*
 * Tickets: docs/tickets/location-search/issues/04-gps-address-server-validation.md
 *          docs/tickets/location-search/issues/08-refused-edit-names-the-field.md
 *
 * What the API answers when a building edit is refused because of the GhanaPost
 * GPS address. The answer's `error` text is what the edit form shows the person;
 * its `field` names the refused field, so the form can say which one to fix.
 * A refusal that is not about one field has no `field`.
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

describe('POST /api/buildings/:building_id.json, when the API refuses the edit', () => {
    let server: http.Server;

    function editBuilding(attributes: Record<string, unknown>, buildingId = '1') {
        const port = (server.address() as AddressInfo).port;
        return postJson(port, `/api/buildings/${buildingId}.json`, { attributes });
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

    it('answers a badly formatted address with the normal invalid-field 400, naming the field', async () => {
        const response = await editBuilding({ location_gps_address: 'hello' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Invalid format of data sent',
            field: 'location_gps_address'
        });
    });

    it('answers an address too long for the database with the same 400, not a server error', async () => {
        const response = await editBuilding({ location_gps_address: 'GA-183-9385-00000000' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Invalid format of data sent',
            field: 'location_gps_address'
        });
    });

    it('answers a refusal that is not about one field without a field', async () => {
        // the building id is refused before any field is looked at
        const response = await editBuilding({ location_gps_address: 'GA-183-9385' }, 'not-a-number');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Problem with parameter building_id: Invalid format: not a positive integer'
        });
        expect(response.body).not.toHaveProperty('field');
    });
});
