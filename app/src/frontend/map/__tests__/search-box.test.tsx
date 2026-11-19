/**
 * Search results appear from the first letter and keep updating while the person types.
 * Tickets: docs/tickets/location-search/issues/23-search-as-you-type.md,
 *          docs/tickets/location-search/issues/24-search-every-keystroke.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';

import { apiGet } from '../../apiHelpers';
import SearchBox, { SearchResult } from '../search-box';

jest.mock('../../apiHelpers');

function place(id: number, label: string): SearchResult {
    return {
        id,
        type: 'Feature',
        attributes: { label, search_class: 'town', zoom: 14 },
        geometry: { type: 'Point', coordinates: [-0.2, 5.6] },
    };
}

const ACCRA = place(1, 'Accra, Greater Accra');
const KUMBI = place(2, 'Kumbi, Oti');
const KUMASI = place(3, 'Kumasi, Ashanti');

/** The text a search request was for. */
function searchedText(path: string): string {
    return decodeURIComponent(path.replace('/api/search?q=', ''));
}

describe('<SearchBox /> search as you type', () => {
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;
    let onResults: jest.Mock;
    /** Requests the test is holding back, by the text searched for, until it answers or fails them. */
    let pending: Map<string, { resolve: (data: unknown) => void, reject: (error: Error) => void }>;

    beforeEach(() => {
        pending = new Map();
        apiGetMock.mockReset();
        apiGetMock.mockImplementation((path: string) => new Promise((resolve, reject) => {
            pending.set(searchedText(path), { resolve, reject });
        }));
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        onResults = jest.fn();

        container = document.createElement('div');
        document.body.appendChild(container);
        act(() => {
            ReactDOM.render(
                <SearchBox onResults={onResults} onResultHover={jest.fn()} onResultSelect={jest.fn()} />,
                container
            );
        });
    });

    afterEach(() => {
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        container.remove();
        jest.restoreAllMocks();
    });

    function input(): HTMLInputElement {
        return container.querySelector('#search-box-q') as HTMLInputElement;
    }

    function type(text: string) {
        act(() => {
            input().value = text;
            Simulate.change(input());
        });
    }

    function request(q: string) {
        const found = pending.get(q);
        if (!found) {
            throw new Error(`no request was sent for "${q}"`);
        }
        return found;
    }

    /** Deliver the answer to the request for this text. */
    async function answer(q: string, results: SearchResult[]) {
        await act(async () => { request(q).resolve({ results }); });
    }

    /** Make the request for this text fail, as when the connection drops. */
    async function fail(q: string) {
        await act(async () => { request(q).reject(new Error('offline')); });
    }

    function requestedTexts(): string[] {
        return apiGetMock.mock.calls.map(([path]) => searchedText(path));
    }

    function failureShown(): boolean {
        return container.querySelector('[role="alert"]') !== null;
    }

    function listedLabels(): string[] {
        return Array.from(container.querySelectorAll('.search-result-label')).map(el => el.textContent);
    }

    function pressEscape() {
        act(() => { Simulate.keyDown(input(), { key: 'Escape' }); });
    }

    function searchButton(): HTMLButtonElement {
        return container.querySelector('.search-btn') as HTMLButtonElement;
    }

    it('searches from the first letter, without pressing Search', async () => {
        type('a');
        expect(requestedTexts()).toEqual(['a']);

        await answer('a', [ACCRA]);

        expect(listedLabels()).toEqual(['Accra, Greater Accra']);
        expect(onResults).toHaveBeenLastCalledWith([ACCRA]);
        expect(searchButton().textContent).toBe('Search');
    });

    it('sends a request for the text so far on every keystroke', () => {
        type('k');
        type('ku');
        type('kum');

        expect(requestedTexts()).toEqual(['k', 'ku', 'kum']);
    });

    it('keeps updating the list while the person types, even when answers come after the next keystroke', async () => {
        type('k');
        type('ku');
        await answer('k', [KUMBI]);
        expect(listedLabels()).toEqual(['Kumbi, Oti']);
        expect(onResults).toHaveBeenLastCalledWith([KUMBI]);
        expect(searchButton().textContent).toBe('Search');

        type('kum');
        await answer('ku', [KUMBI, KUMASI]);
        expect(listedLabels()).toEqual(['Kumbi, Oti', 'Kumasi, Ashanti']);
        expect(onResults).toHaveBeenLastCalledWith([KUMBI, KUMASI]);

        await answer('kum', [KUMASI]);
        expect(listedLabels()).toEqual(['Kumasi, Ashanti']);
        expect(onResults).toHaveBeenLastCalledWith([KUMASI]);
        expect(searchButton().textContent).toBe('Search');
    });

    it('keeps the answer for the latest text when an older answer arrives after it', async () => {
        type('kum');
        type('kumasi');
        await answer('kumasi', [KUMASI]);

        await answer('kum', [KUMBI]);

        expect(listedLabels()).toEqual(['Kumasi, Ashanti']);
        expect(onResults).toHaveBeenLastCalledWith([KUMASI]);
    });

    it('sends nothing for empty text and clears the list', async () => {
        type('a');
        await answer('a', [ACCRA]);

        type(' ');

        expect(requestedTexts()).toEqual(['a']);
        expect(listedLabels()).toEqual([]);
        expect(onResults).toHaveBeenLastCalledWith([]);
    });

    it('drops an answer that arrives after the text is cleared', async () => {
        type('a');
        type('');
        await answer('a', [ACCRA]);

        expect(listedLabels()).toEqual([]);
    });

    it('drops an answer that arrives after Escape, and the Search button is usable again', async () => {
        type('acc');

        pressEscape();
        await answer('acc', [ACCRA]);

        expect(input().value).toBe('');
        expect(listedLabels()).toEqual([]);
        expect(onResults).toHaveBeenLastCalledWith([]);
        expect(searchButton().disabled).toBe(false);
        expect(searchButton().textContent).toBe('Search');
    });

    it('drops an answer that arrives after the person picks a result', async () => {
        type('acc');
        await answer('acc', [ACCRA]);
        type('accr');
        act(() => { Simulate.click(container.querySelector('.search-result')); });

        await answer('accr', [place(4, 'Accra, Western')]);

        expect(listedLabels()).toEqual([]);
        expect(searchButton().disabled).toBe(false);
        expect(searchButton().textContent).toBe('Search');
    });

    it('lets the person press Search or Enter while a search is still on its way, to try again', async () => {
        type('accra');
        expect(searchButton().disabled).toBe(false);

        act(() => { Simulate.submit(container.querySelector('form')); });

        expect(requestedTexts()).toEqual(['accra', 'accra']);
        await answer('accra', [ACCRA]);
        expect(listedLabels()).toEqual(['Accra, Greater Accra']);
    });

    it('shows a failure only for the latest text, so the list stays while a newer search is on its way', async () => {
        type('k');
        await answer('k', [KUMBI]);
        type('ku');
        type('kum');

        await fail('ku');
        expect(failureShown()).toBe(false);
        expect(listedLabels()).toEqual(['Kumbi, Oti']);

        await fail('kum');
        expect(failureShown()).toBe(true);
        expect(searchButton().textContent).toBe('Search');
    });

    it('drops an answer that arrives after the box is removed', async () => {
        type('acc');
        act(() => { ReactDOM.unmountComponentAtNode(container); });

        await answer('acc', [ACCRA]);

        expect(onResults).not.toHaveBeenCalled();
    });

    it('hides an earlier failure as soon as the person types again', async () => {
        type('acc');
        await fail('acc');
        expect(failureShown()).toBe(true);

        type('accr');

        expect(failureShown()).toBe(false);
    });
});
