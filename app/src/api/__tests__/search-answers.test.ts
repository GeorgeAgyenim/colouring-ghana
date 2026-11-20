/**
 * @jest-environment node
 */
/*
 * Ticket: docs/tickets/location-search/issues/01-search-relevance-and-index-integrity.md
 *
 * What GET /api/search answers for the rows the index returns. The label the person sees
 * is the row's display label (a town's primary name and region), or its stored text when
 * it has none. Rows too far from what was typed are not sent at all.
 * The real API router is used, over HTTP on a local port; only the database is replaced.
 */
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';

import db from '../../db';
import apiRouter from '../api';

jest.mock('../../db', () => {
    const pgPromise = jest.requireActual('pg-promise');
    return {
        __esModule: true,
        default: {
            // the real pg-promise helpers, which build SQL text and need no connection
            $config: { pgp: pgPromise() },
            manyOrNone: jest.fn()
        }
    };
});

const database = db as unknown as { manyOrNone: jest.Mock };

const POINT = '{"type":"Point","coordinates":[-0.19,5.56]}';

interface SearchAnswer {
    results: { attributes: { label: string; search_class: string; zoom: number }; geometry: unknown }[];
}

describe('GET /api/search', () => {
    let server: http.Server;

    function search(q: string): Promise<SearchAnswer> {
        const port = (server.address() as AddressInfo).port;
        return new Promise((resolve, reject) => {
            http.get({ host: '127.0.0.1', port, path: `/api/search?q=${encodeURIComponent(q)}` }, response => {
                let text = '';
                response.on('data', chunk => text += chunk);
                response.on('end', () => resolve(JSON.parse(text)));
            }).on('error', reject);
        });
    }

    beforeAll(() => {
        const app = express();
        app.use('/api', apiRouter);
        return new Promise<void>(resolve => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
    });

    afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

    it('labels a town found by another spelling with its primary name and region', async () => {
        database.manyOrNone.mockResolvedValue([
            {
                search_id: 11, search_str: 'Acra', display_label: 'Accra, Greater Accra', search_class: 'town',
                st_asgeojson: POINT, zoom: 12, place_id: '2306104', population: '1963264', word_dist: 0, dist: 0
            }
        ]);

        const answer = await search('acra');

        expect(answer.results).toHaveLength(1);
        expect(answer.results[0].attributes).toEqual({ label: 'Accra, Greater Accra', search_class: 'town', zoom: 12 });
        expect(answer.results[0].geometry).toEqual(JSON.parse(POINT));
    });

    it('labels a row with no display label by its stored text', async () => {
        database.manyOrNone.mockResolvedValue([
            {
                search_id: 12, search_str: 'GA-183-9385', display_label: null, search_class: 'gps',
                st_asgeojson: POINT, zoom: 18, place_id: null, population: null, word_dist: 0, dist: 0
            }
        ]);

        const answer = await search('GA-183-9385');

        expect(answer.results[0].attributes.label).toBe('GA-183-9385');
    });

    it('answers an empty list when nothing is close to what was typed', async () => {
        database.manyOrNone.mockResolvedValue([
            {
                search_id: 13, search_str: 'Zinabo', display_label: 'Zinabo, Bono', search_class: 'town',
                st_asgeojson: POINT, zoom: 14, place_id: '1', population: '0', word_dist: 0.89, dist: 0.94
            }
        ]);

        const answer = await search('zzqqxxjj');

        expect(answer).toEqual({ results: [] });
    });
});
