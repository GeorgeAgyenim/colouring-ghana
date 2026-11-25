import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { apiGet } from '../../apiHelpers';
import DataExtracts from '../data-extracts';

jest.mock('../../apiHelpers', () => ({ apiGet: jest.fn() }));

const mockApiGet = apiGet as jest.Mock;

let container: HTMLDivElement;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
});

afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    mockApiGet.mockReset();
});

async function renderPage() {
    await act(async () => {
        ReactDOM.render(<MemoryRouter><DataExtracts /></MemoryRouter>, container);
    });
}

function extract(id: number, isoDate: string) {
    return {
        extract_id: id,
        extracted_on: new Date(isoDate),
        download_path: `/downloads/data-extract-${id}.zip`
    };
}

describe('<DataExtracts />', () => {
    test('says loading until the API answers', async () => {
        mockApiGet.mockReturnValue(new Promise(() => undefined)); // never settles
        await renderPage();
        expect(container.textContent).toContain('Loading extracts...');
    });

    test('says none are available when the list is empty', async () => {
        mockApiGet.mockResolvedValue({ extracts: [] });
        await renderPage();
        expect(container.textContent).toContain('No extracts available');
        expect(container.querySelectorAll('a[href^="/downloads/"]')).toHaveLength(0);
    });

    test('says extracts could not be loaded when the API reports a database error', async () => {
        // the API sends { extracts: undefined }, which JSON drops
        mockApiGet.mockResolvedValue({});
        await renderPage();
        expect(container.textContent).toContain('Extracts could not be loaded');
        expect(container.textContent).not.toContain('Loading extracts...');
    });

    test('says extracts could not be loaded when the request fails', async () => {
        mockApiGet.mockRejectedValue(new TypeError('Failed to fetch'));
        await renderPage();
        expect(container.textContent).toContain('Extracts could not be loaded');
    });

    test('links the latest extract and lists older ones', async () => {
        mockApiGet.mockResolvedValue({ extracts: [
            extract(2, '2026-11-25T03:00:00Z'),
            extract(1, '2026-11-24T03:00:00Z')
        ] });
        await renderPage();

        const links = Array.from(container.querySelectorAll('a[href^="/downloads/"]'));
        expect(links.map(a => a.getAttribute('href'))).toEqual([
            '/downloads/data-extract-2.zip',
            '/downloads/data-extract-1.zip'
        ]);
        expect(container.textContent).toContain('Latest extract');
        expect(container.textContent).toContain('Older extracts');
        expect(container.textContent).not.toContain('No extracts available');
    });
});
