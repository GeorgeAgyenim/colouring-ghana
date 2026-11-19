/**
 * Search results appear while the person types, without pressing Search.
 * Ticket: docs/tickets/location-search/issues/23-search-as-you-type.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';

import { apiGet } from '../../apiHelpers';
import SearchBox, { SearchResult } from '../search-box';

jest.mock('../../apiHelpers');

/** How long the box waits after the last keystroke before searching. */
const PAUSE_MS = 300;

function place(id: number, label: string): SearchResult {
    return {
        id,
        type: 'Feature',
        attributes: { label, search_class: 'town', zoom: 14 },
        geometry: { type: 'Point', coordinates: [-0.2, 5.6] },
    };
}

describe('<SearchBox /> search as you type', () => {
    const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

    let container: HTMLDivElement;
    let onResults: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        apiGetMock.mockReset();
        apiGetMock.mockResolvedValue({ results: [place(1, 'Accra, Greater Accra')] });
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
        jest.useRealTimers();
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

    /** Let the pause pass and any answer that has arrived be shown. */
    async function waitForPause() {
        await act(async () => {
            jest.advanceTimersByTime(PAUSE_MS);
        });
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

    function wait(ms: number) {
        act(() => { jest.advanceTimersByTime(ms); });
    }

    it('shows results after the person pauses typing, without pressing Search', async () => {
        type('acc');
        wait(PAUSE_MS - 1);
        expect(apiGetMock).not.toHaveBeenCalled();
        await waitForPause();

        expect(apiGetMock).toHaveBeenCalledWith('/api/search?q=acc');
        expect(listedLabels()).toEqual(['Accra, Greater Accra']);
        expect(onResults).toHaveBeenLastCalledWith([place(1, 'Accra, Greater Accra')]);
    });

    it('sends one request for the final text when the person types fast', async () => {
        type('kum');
        type('kuma');
        type('kumas');
        type('kumasi');
        await waitForPause();

        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(apiGetMock).toHaveBeenCalledWith('/api/search?q=kumasi');
    });

    it('waits for a pause after the last keystroke, not the first', async () => {
        type('kum');
        wait(200);
        type('kuma');
        wait(200);
        expect(apiGetMock).not.toHaveBeenCalled();

        await waitForPause();

        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(apiGetMock).toHaveBeenCalledWith('/api/search?q=kuma');
    });

    it('drops the waiting search when the text gets shorter than 3 characters before the pause', async () => {
        type('acc');
        type('ac');
        await waitForPause();

        expect(apiGetMock).not.toHaveBeenCalled();
    });

    it('sends no request below 3 characters and clears the list when the text gets that short', async () => {
        type('acc');
        await waitForPause();
        expect(listedLabels()).toEqual(['Accra, Greater Accra']);

        type('ac');
        await waitForPause();

        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(listedLabels()).toEqual([]);
        expect(onResults).toHaveBeenLastCalledWith([]);
    });

    it('keeps the answer for the latest text when an older answer arrives after it', async () => {
        let answerKum: (value: unknown) => void;
        apiGetMock
            .mockReturnValueOnce(new Promise(resolve => { answerKum = resolve; }))
            .mockResolvedValueOnce({ results: [place(2, 'Kumasi, Ashanti')] });

        type('kum');
        await waitForPause();
        type('kumasi');
        await waitForPause();
        expect(listedLabels()).toEqual(['Kumasi, Ashanti']);

        await act(async () => { answerKum({ results: [place(3, 'Kumbi, Oti')] }); });

        expect(listedLabels()).toEqual(['Kumasi, Ashanti']);
        expect(onResults).toHaveBeenLastCalledWith([place(2, 'Kumasi, Ashanti')]);
    });

    it('sends no request when the person presses Escape before the pause ends', async () => {
        type('acc');
        pressEscape();
        await waitForPause();

        expect(apiGetMock).not.toHaveBeenCalled();
        expect(input().value).toBe('');
    });

    it('ignores an answer that arrives after Escape, and the Search button is usable again', async () => {
        let answer: (value: unknown) => void;
        apiGetMock.mockReturnValueOnce(new Promise(resolve => { answer = resolve; }));

        type('acc');
        await waitForPause();
        expect(searchButton().disabled).toBe(true);

        pressEscape();
        await act(async () => { answer({ results: [place(1, 'Accra, Greater Accra')] }); });

        expect(listedLabels()).toEqual([]);
        expect(onResults).toHaveBeenLastCalledWith([]);
        expect(searchButton().disabled).toBe(false);
        expect(searchButton().textContent).toBe('Search');
    });

    it('searches straight away on Search, and the pause does not search again', async () => {
        type('accra');
        act(() => { Simulate.submit(container.querySelector('form')); });
        expect(apiGetMock).toHaveBeenCalledWith('/api/search?q=accra');

        await waitForPause();

        expect(apiGetMock).toHaveBeenCalledTimes(1);
        expect(listedLabels()).toEqual(['Accra, Greater Accra']);
    });

    it('hides an earlier failure as soon as the person types again', async () => {
        apiGetMock.mockRejectedValueOnce(new Error('offline'));
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        type('acc');
        await waitForPause();
        expect(container.querySelector('[role="alert"]')).not.toBeNull();

        type('accr');

        expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('drops the answer still on its way when the person picks a result', async () => {
        let answer: (value: unknown) => void;
        apiGetMock
            .mockResolvedValueOnce({ results: [place(1, 'Accra, Greater Accra')] })
            .mockReturnValueOnce(new Promise(resolve => { answer = resolve; }));

        type('acc');
        await waitForPause();
        type('accr');
        await waitForPause();
        act(() => { Simulate.click(container.querySelector('.search-result')); });
        await act(async () => { answer({ results: [place(4, 'Accra, Western')] }); });

        expect(listedLabels()).toEqual([]);
    });

    it('sends no request when the box is removed before the pause ends', () => {
        type('acc');
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        wait(PAUSE_MS);

        expect(apiGetMock).not.toHaveBeenCalled();
    });
});
