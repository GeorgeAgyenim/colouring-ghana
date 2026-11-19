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

describe('<SearchBox /> search as you type', () => {
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;
    let onResults: jest.Mock;
    /** Answers to requests the test is holding back, by the text searched for. */
    let answers: Map<string, (results: SearchResult[]) => Promise<void>>;

    beforeEach(() => {
        answers = new Map();
        apiGetMock.mockReset();
        apiGetMock.mockImplementation((path: string) => new Promise(resolve => {
            const q = decodeURIComponent(path.replace('/api/search?q=', ''));
            answers.set(q, async (results) => {
                await act(async () => { resolve({ results }); });
            });
        }));
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

    /** Deliver the answer to the request for this text. */
    function answer(q: string, results: SearchResult[]): Promise<void> {
        const deliver = answers.get(q);
        if (!deliver) {
            throw new Error(`no request was sent for "${q}"`);
        }
        return deliver(results);
    }

    function requestedTexts(): string[] {
        return apiGetMock.mock.calls.map(([path]) => decodeURIComponent(path.replace('/api/search?q=', '')));
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

        type('kum');
        await answer('ku', [KUMBI, KUMASI]);
        expect(listedLabels()).toEqual(['Kumbi, Oti', 'Kumasi, Ashanti']);

        await answer('kum', [KUMASI]);
        expect(listedLabels()).toEqual(['Kumasi, Ashanti']);
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
        expect(searchButton().disabled).toBe(true);

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
    });

    it('searches the current text when the person presses Search', async () => {
        type('accra');
        await answer('accra', [ACCRA]);

        act(() => { Simulate.submit(container.querySelector('form')); });

        expect(requestedTexts()).toEqual(['accra', 'accra']);
    });

    it('hides an earlier failure as soon as the person types again', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        apiGetMock.mockRejectedValueOnce(new Error('offline'));
        await act(async () => {
            input().value = 'acc';
            Simulate.change(input());
        });
        expect(container.querySelector('[role="alert"]')).not.toBeNull();

        type('accr');

        expect(container.querySelector('[role="alert"]')).toBeNull();
    });
});
