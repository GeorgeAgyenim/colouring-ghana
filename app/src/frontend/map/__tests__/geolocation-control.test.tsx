/**
 * The "you are here" marker is a plain dot with an accuracy circle and no direction arrow.
 * Ticket: docs/tickets/location-search/issues/05-location-marker-plain-dot.md
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

describe('<GeolocationControl />', () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    let container: HTMLDivElement;
    let deliverPosition: PositionCallback;
    let clearWatch: jest.Mock;
    let addEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        // jsdom has no canvas; Leaflet draws the accuracy circle on one. Any drawing call is a no-op.
        HTMLCanvasElement.prototype.getContext = (() =>
            new Proxy({}, { get: () => () => undefined })) as unknown as typeof originalGetContext;

        clearWatch = jest.fn();
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                watchPosition: jest.fn((onSuccess: PositionCallback) => {
                    deliverPosition = onSuccess;
                    return 1;
                }),
                clearWatch,
            },
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

    afterEach(() => {
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
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        const dots = container.querySelectorAll('.location-dot');
        expect(dots).toHaveLength(1);
        expect(dots[0].querySelector('svg circle')).not.toBeNull();
        expect(dots[0].querySelector('polygon')).toBeNull();
        expect(dots[0].innerHTML).not.toContain('rotate(');
    });

    test('moves the same dot when the position changes', () => {
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
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        const listenedTo = addEventListenerSpy.mock.calls.map(call => call[0]);
        expect(listenedTo).not.toContain('deviceorientation');
        expect(listenedTo).not.toContain('deviceorientationabsolute');
    });

    test('"Go to my location" centres the map on the position at the closest zoom', () => {
        const setView = jest.spyOn(L.Map.prototype, 'setView');
        act(() => deliverPosition(fakePosition(5.601, -0.191)));
        setView.mockClear();

        const button = container.querySelector<HTMLAnchorElement>('.leaflet-control-locate a');
        expect(button).not.toBeNull();
        act(() => button.click());

        expect(setView).toHaveBeenCalledTimes(1);
        const [centre, zoom] = setView.mock.calls[0];
        expect(centre).toMatchObject({ lat: 5.601, lng: -0.191 });
        expect(zoom).toBe(19);
        setView.mockRestore();
    });

    test('removes the dot and stops watching when the control is removed from a live map', () => {
        act(() => deliverPosition(fakePosition(5.6, -0.19)));

        renderMap({ withControl: false });

        // The map is still there, so only the control's own cleanup can have removed the dot.
        expect(container.querySelector('.leaflet-container')).not.toBeNull();
        expect(container.querySelector('.location-dot')).toBeNull();
        expect(container.querySelector('.leaflet-control-locate')).toBeNull();
        expect(clearWatch).toHaveBeenCalledWith(1);
    });
});
