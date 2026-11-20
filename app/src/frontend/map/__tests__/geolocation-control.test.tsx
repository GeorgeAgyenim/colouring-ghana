/**
 * The "you are here" marker is a plain dot with an accuracy circle and no direction arrow.
 * Ticket: docs/tickets/location-search/issues/05-location-marker-plain-dot.md
 *
 * Location is asked for only when the person taps "Go to my location", and the watch pauses while the page
 * is hidden.
 * Ticket: docs/tickets/location-search/issues/06-ask-for-location-on-tap.md
 *
 * Every failure shows one plain line; "Learn more" opens a pop-up with what to try.
 * Ticket: docs/tickets/location-search/issues/26-location-off-reads-as-slow.md
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import L from 'leaflet';
import { MapContainer } from 'react-leaflet';

import { GeolocationControl } from '../geolocation-control';

/** A position as the browser reports it. It carries a heading on purpose: the control must ignore it. */
function fakePosition(latitude: number, longitude: number): GeolocationPosition {
    return {
        coords: {
            latitude,
            longitude,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: 90,
            speed: 1,
        },
        timestamp: 0,
    } as GeolocationPosition;
}

/** A failure as the browser reports it: 1 refused, 2 no position, 3 took too long. */
function fakeError(code: 1 | 2 | 3): GeolocationPositionError {
    return {
        code,
        message: '',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
    } as GeolocationPositionError;
}

describe('<GeolocationControl />', () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    let container: HTMLDivElement;
    let deliverPosition: PositionCallback;
    let deliverError: PositionErrorCallback;
    let watchPosition: jest.Mock;
    let clearWatch: jest.Mock;
    let addEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        // jsdom has no canvas; Leaflet draws the accuracy circle on one. Any drawing call is a no-op.
        HTMLCanvasElement.prototype.getContext = (() =>
            new Proxy({}, { get: () => () => undefined })) as unknown as typeof originalGetContext;

        clearWatch = jest.fn();
        // Each watch gets the next id, so a test can tell a restarted watch from the first one.
        watchPosition = jest.fn((onSuccess: PositionCallback, onError: PositionErrorCallback) => {
            deliverPosition = onSuccess;
            deliverError = onError;
            return watchPosition.mock.calls.length;
        });
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: { watchPosition, clearWatch },
        });

        addEventListenerSpy = jest.spyOn(window, 'addEventListener');

        container = document.createElement('div');
        document.body.appendChild(container);
        renderMap({ withControl: true });
    });

    /** Renders the map into the container; rendering again without the control removes only the control. */
    function renderMap({ withControl }: { withControl: boolean }): void {
        act(() => {
            ReactDOM.render(
                // preferCanvas: jsdom cannot build Leaflet's default SVG renderer for the circle.
                <MapContainer center={[5.6, -0.19]} zoom={16} preferCanvas>
                    {withControl && <GeolocationControl />}
                </MapContainer>,
                container
            );
        });
    }

    function locateButton(): HTMLAnchorElement {
        const button = container.querySelector<HTMLAnchorElement>('.leaflet-control-locate a');
        expect(button).not.toBeNull();
        return button;
    }

    function tapLocate(): void {
        act(() => locateButton().click());
    }

    /** The messages shown over the map. role="alert" is what makes a screen reader announce them. */
    function messages(): HTMLElement[] {
        return Array.from(container.querySelectorAll<HTMLElement>('[role="alert"]'));
    }

    /** The one line every failure shows. "Learn more" follows it as text; the close button is an ×, no text. */
    const FAILURE_LINE = 'Your location could not be found.';
    const MESSAGE_TEXT = `${FAILURE_LINE} Learn more`;

    /** The × that closes the message. It has no text, so a screen reader reads its label. */
    function closeCross(message: HTMLElement): HTMLButtonElement {
        const cross = message.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
        expect(cross).not.toBeNull();
        expect(cross.textContent).toBe('');
        return cross;
    }

    function buttonIn(element: HTMLElement, label: string): HTMLButtonElement {
        const button = Array.from(element.querySelectorAll('button')).find(b => b.textContent === label);
        expect(button).toBeDefined();
        return button;
    }

    /** The "Learn more" pop-up. It is drawn over the whole page, not inside the map. */
    function helpPopup(): HTMLElement | null {
        return document.body.querySelector<HTMLElement>('[role="dialog"]');
    }

    /** Hide or show the page, as switching tab or app, or turning the screen off, does. */
    function setPageVisible(visible: boolean): void {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => visible ? 'visible' : 'hidden',
        });
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
    }

    afterEach(() => {
        delete (document as { visibilityState?: string }).visibilityState;
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
        addEventListenerSpy.mockRestore();
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        if (originalGeolocation) {
            Object.defineProperty(navigator, 'geolocation', originalGeolocation);
        } else {
            delete (navigator as { geolocation?: Geolocation }).geolocation;
        }
    });

    test('shows the position as a single dot, not an arrow', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        const dots = container.querySelectorAll('.location-dot');
        expect(dots).toHaveLength(1);
        expect(dots[0].querySelector('svg circle')).not.toBeNull();
        expect(dots[0].querySelector('polygon')).toBeNull();
        expect(dots[0].innerHTML).not.toContain('rotate(');
    });

    test('moves the same dot when the position changes', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));
        const dot = container.querySelector('.location-dot');
        expect(dot).not.toBeNull();
        // Leaflet places a marker through its inline style; that is the only trace of position in the DOM.
        const drawnAt = dot.getAttribute('style');

        act(() => deliverPosition(fakePosition(5.601, -0.191)));

        expect(container.querySelectorAll('.location-dot')).toHaveLength(1);
        expect(container.querySelector('.location-dot')).toBe(dot);
        expect(dot.getAttribute('style')).not.toEqual(drawnAt);
    });

    test('does not listen to the compass', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        const listenedTo = addEventListenerSpy.mock.calls.map(call => call[0]);
        expect(listenedTo).not.toContain('deviceorientation');
        expect(listenedTo).not.toContain('deviceorientationabsolute');
    });

    test('loading the map does not ask for location', () => {
        expect(watchPosition).not.toHaveBeenCalled();
        expect(container.querySelector('.location-dot')).toBeNull();
    });

    test('the first tap asks for location, pulses until it arrives, then centres the map on it', () => {
        const setView = jest.spyOn(L.Map.prototype, 'setView');
        tapLocate();

        expect(watchPosition).toHaveBeenCalledTimes(1);
        expect(watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true });
        expect(locateButton().classList).toContain('locating');
        expect(setView).not.toHaveBeenCalled();

        act(() => deliverPosition(fakePosition(5.601, -0.191)));

        expect(locateButton().classList).not.toContain('locating');
        expect(setView).toHaveBeenCalledTimes(1);
        const [centre, zoom] = setView.mock.calls[0];
        expect(centre).toMatchObject({ lat: 5.601, lng: -0.191 });
        expect(zoom).toBe(19);

        // Later positions move the dot but leave the map where the person put it.
        setView.mockClear();
        act(() => deliverPosition(fakePosition(5.602, -0.192)));
        expect(setView).not.toHaveBeenCalled();
        setView.mockRestore();
    });

    test('a second tap while still waiting does not ask again', () => {
        tapLocate();
        tapLocate();
        expect(watchPosition).toHaveBeenCalledTimes(1);
    });

    test('"Go to my location" centres the map on the live position at the closest zoom', () => {
        const setView = jest.spyOn(L.Map.prototype, 'setView');
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));
        act(() => deliverPosition(fakePosition(5.601, -0.191)));
        setView.mockClear();

        tapLocate();

        expect(setView).toHaveBeenCalledTimes(1);
        const [centre, zoom] = setView.mock.calls[0];
        expect(centre).toMatchObject({ lat: 5.601, lng: -0.191 });
        expect(zoom).toBe(19);
        setView.mockRestore();
    });

    test('a refusal shows the failure line, and tapping again asks again', () => {
        tapLocate();
        act(() => deliverError(fakeError(1)));

        expect(messages()).toHaveLength(1);
        expect(messages()[0].textContent).toBe(MESSAGE_TEXT);
        // In the box the boundary-layer messages use, so the two stack instead of overlapping.
        expect(messages()[0].parentElement.classList).toContain('map-messages');
        expect(clearWatch).toHaveBeenCalledWith(1);
        // The button stays usable: no greyed-out state, no pulse.
        expect(locateButton().classList).not.toContain('leaflet-disabled');
        expect(locateButton().classList).not.toContain('locating');
        expect(locateButton().getAttribute('aria-disabled')).toBeNull();

        tapLocate();

        expect(watchPosition).toHaveBeenCalledTimes(2);
        expect(locateButton().classList).toContain('locating');
        expect(messages()).toHaveLength(0);
    });

    test('no position and too slow show the same one line as a refusal', () => {
        tapLocate();
        act(() => deliverError(fakeError(2)));
        expect(messages()[0].textContent).toBe(MESSAGE_TEXT);

        tapLocate();
        act(() => deliverError(fakeError(3)));
        expect(messages()).toHaveLength(1);
        expect(messages()[0].textContent).toBe(MESSAGE_TEXT);
    });

    test('a browser that cannot share location shows the same one line', () => {
        delete (navigator as { geolocation?: Geolocation }).geolocation;
        tapLocate();

        expect(messages()).toHaveLength(1);
        expect(messages()[0].textContent).toBe(MESSAGE_TEXT);
    });

    // Chrome on Android reports location switched off for the whole phone as a timeout, so the pop-up covers
    // every cause rather than guessing one from the browser's answer (issue 26).
    test('"Learn more" opens a pop-up with what to try; its Close shuts it and returns to the message', () => {
        tapLocate();
        act(() => deliverError(fakeError(3)));
        expect(helpPopup()).toBeNull();

        const learnMore = buttonIn(messages()[0], 'Learn more');
        act(() => learnMore.click());

        const popup = helpPopup();
        expect(popup).not.toBeNull();
        expect(popup.getAttribute('aria-modal')).toBe('true');
        const title = document.getElementById(popup.getAttribute('aria-labelledby'));
        expect(title.textContent).toBe('Finding your location');
        expect(popup.textContent).toContain('site settings');
        expect(popup.textContent).toContain('device\'s settings');
        expect(popup.textContent).toContain('near a window');
        expect(popup.textContent).toContain('recent browser');
        // Keyboard and screen-reader users land in the pop-up.
        const close = buttonIn(popup, 'Close');
        expect(document.activeElement).toBe(close);

        act(() => close.click());

        expect(helpPopup()).toBeNull();
        expect(messages()).toHaveLength(1);
        expect(document.activeElement).toBe(buttonIn(messages()[0], 'Learn more'));
    });

    test('Escape, or a tap outside the pop-up, also closes it', () => {
        tapLocate();
        act(() => deliverError(fakeError(1)));

        act(() => buttonIn(messages()[0], 'Learn more').click());
        // Tab stays on the pop-up's Close: focus does not wander to the page behind.
        const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        act(() => {
            document.activeElement.dispatchEvent(tab);
        });
        expect(tab.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(buttonIn(helpPopup(), 'Close'));
        // Escape works even when focus has left the pop-up, as a tap on its text can do in Safari.
        act(() => {
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(helpPopup()).toBeNull();

        act(() => buttonIn(messages()[0], 'Learn more').click());
        act(() => helpPopup().click());
        expect(helpPopup()).toBeNull();
    });

    test('the message can be closed', () => {
        tapLocate();
        act(() => deliverError(fakeError(1)));

        act(() => closeCross(messages()[0]).click());

        expect(messages()).toHaveLength(0);
    });

    test('a slow position while already tracking says nothing and keeps the dot', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));
        act(() => deliverError(fakeError(3)));

        expect(messages()).toHaveLength(0);
        expect(clearWatch).not.toHaveBeenCalled();
        expect(container.querySelector('.location-dot')).not.toBeNull();
    });

    test('losing permission while tracking stops, removes the dot and says so', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));
        act(() => deliverError(fakeError(1)));

        expect(clearWatch).toHaveBeenCalledWith(1);
        expect(container.querySelector('.location-dot')).toBeNull();
        expect(messages()).toHaveLength(1);
        expect(messages()[0].textContent).toBe(MESSAGE_TEXT);
    });

    test('hiding the page stops the watch and keeps the dot; showing it again carries on without moving the map', () => {
        const setView = jest.spyOn(L.Map.prototype, 'setView');
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));
        setView.mockClear();

        setPageVisible(false);

        expect(clearWatch).toHaveBeenCalledWith(1);
        expect(container.querySelector('.location-dot')).not.toBeNull();

        setPageVisible(true);

        expect(watchPosition).toHaveBeenCalledTimes(2);
        act(() => deliverPosition(fakePosition(5.601, -0.191)));
        expect(container.querySelector('.location-dot')).not.toBeNull();
        expect(setView).not.toHaveBeenCalled();

        // The restarted watch is the one stopped when the control goes.
        renderMap({ withControl: false });
        expect(clearWatch).toHaveBeenLastCalledWith(2);
        setView.mockRestore();
    });

    test('a page hidden while still finding the position finishes the job when shown again', () => {
        const setView = jest.spyOn(L.Map.prototype, 'setView');
        tapLocate();
        setPageVisible(false);
        setPageVisible(true);

        expect(watchPosition).toHaveBeenCalledTimes(2);
        expect(locateButton().classList).toContain('locating');
        act(() => deliverPosition(fakePosition(5.601, -0.191)));
        expect(setView).toHaveBeenCalledTimes(1);
        setView.mockRestore();
    });

    test('a page hidden and shown before any tap asks for nothing', () => {
        setPageVisible(false);
        setPageVisible(true);
        expect(watchPosition).not.toHaveBeenCalled();
    });

    test('after a refusal, hiding and showing the page does not ask again', () => {
        tapLocate();
        act(() => deliverError(fakeError(1)));
        setPageVisible(false);
        setPageVisible(true);
        expect(watchPosition).toHaveBeenCalledTimes(1);
    });

    test('removes the dot and stops watching when the control is removed from a live map', () => {
        tapLocate();
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        renderMap({ withControl: false });

        // The map is still there, so only the control's own cleanup can have removed the dot.
        expect(container.querySelector('.leaflet-container')).not.toBeNull();
        expect(container.querySelector('.location-dot')).toBeNull();
        expect(container.querySelector('.leaflet-control-locate')).toBeNull();
        expect(clearWatch).toHaveBeenCalledWith(1);
    });
});
