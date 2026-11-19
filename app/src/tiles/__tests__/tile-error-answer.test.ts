/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/15-api-answers-send-raw-errors.md
 *
 * What the tile server answers when a tile cannot be made. The answer is a plain `error` text,
 * never the error itself: an error from the database connection carries the failed query with
 * its values. The real tiles router is used, over HTTP on a local port; making the tile is replaced.
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { format } from 'util';

import { refusedQueryError } from '../../api/testSupport/databaseErrors';
import { renderTile } from '../rendererDefinition';
import tileserver from '../tileserver';

jest.mock('../rendererDefinition', () => ({
    allTilesets: ['date_year'],
    renderTile: jest.fn()
}));

const BUILDING_ID = '2713';

describe('a tile that cannot be made', () => {
    let server: http.Server;

    beforeAll(() => {
        const app = express();
        app.use('/tiles', tileserver);
        return new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
    });

    afterAll(() => new Promise(resolve => server.close(resolve)));

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('gets a 500 with a plain error text, without the query or its values', async () => {
        const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        (renderTile as jest.Mock).mockRejectedValue(refusedQueryError(
            'canceling statement due to statement timeout',
            { code: '57014' },
            'SELECT geometry_id FROM buildings WHERE building_id = $1',
            [BUILDING_ID]
        ));

        const port = (server.address() as AddressInfo).port;
        const answer = await new Promise<{ status: number; text: string }>((resolve, reject) => {
            http.get({ host: '127.0.0.1', port, path: '/tiles/date_year/16/32000/31000.png' }, response => {
                let text = '';
                response.on('data', chunk => text += chunk);
                response.on('end', () => resolve({ status: response.statusCode, text }));
            }).on('error', reject);
        });

        expect(answer.status).toBe(500);
        expect(JSON.parse(answer.text)).toEqual({ error: 'Failed to render tile' });
        expect(answer.text).not.toContain(BUILDING_ID);
        expect(answer.text).not.toContain('SELECT');

        const loggedText = logged.mock.calls.map(call => format(...call)).join('\n');
        expect(loggedText).toContain('Failed to render tile');
        expect(loggedText).not.toContain(BUILDING_ID);
    });
});
