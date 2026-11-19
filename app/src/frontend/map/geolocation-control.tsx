/**
 * GeolocationControl
 *
 * Real-time geolocation for the map.
 *
 * Behaviour:
 *  - Starts tracking the user's position automatically when mounted.
 *  - Renders a dot with an accuracy circle on the map. There is no direction
 *    arrow: a compass heading is not reliable across phones, and a dot is
 *    never wrong (docs/tickets/location-search/issues/05-location-marker-plain-dot.md).
 *  - Adds a "Go to my location" button below the Leaflet zoom controls.
 *    Clicking it re-centres the map to the user's current live position.
 *  - If the position cannot be obtained (permission denied, no GPS fix), the
 *    button is disabled and its tooltip explains why.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Zoom level used when re-centring the map on the user's position.
 * 19 is the map's maximum zoom — close enough to pick out individual
 * buildings in dense areas.
 */
const RECENTER_ZOOM = 19;

/**
 * Options forwarded to navigator.geolocation.watchPosition.
 * High accuracy is essential for on-the-ground field mapping.
 */
const WATCH_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 1_000,   // accept a cached fix up to 1 s old
    timeout:    10_000,  // give up and fire onError after 10 s without a fix
};

/** Colour used consistently for the location dot and accuracy circle. */
const MARKER_COLOUR = '#1a6de0';

const LOCATE_BUTTON_TITLE = 'Go to my location';

// ─── Icon ─────────────────────────────────────────────────────────────────────

/** Side of the square icon box, in pixels. The dot sits in its centre. */
const DOT_ICON_SIZE = 32;
/** Radius of the dot and width of its white outline, in pixels. */
const DOT_RADIUS = 8;
const DOT_OUTLINE_WIDTH = 3;

/**
 * The location dot: a filled circle with a white outline. It never changes,
 * so one icon is shared by every update.
 */
const LOCATION_DOT_ICON: L.DivIcon = L.divIcon({
    // Replaces Leaflet's default white-box class.
    className: 'location-dot',
    html: `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${DOT_ICON_SIZE}"
            height="${DOT_ICON_SIZE}"
            viewBox="0 0 ${DOT_ICON_SIZE} ${DOT_ICON_SIZE}"
            aria-hidden="true"
            focusable="false"
        >
            <circle
                cx="${DOT_ICON_SIZE / 2}"
                cy="${DOT_ICON_SIZE / 2}"
                r="${DOT_RADIUS}"
                fill="${MARKER_COLOUR}"
                stroke="#ffffff"
                stroke-width="${DOT_OUTLINE_WIDTH}"
            />
        </svg>
    `.trim(),
    iconSize:   [DOT_ICON_SIZE, DOT_ICON_SIZE],
    iconAnchor: [DOT_ICON_SIZE / 2, DOT_ICON_SIZE / 2],
});

// ─── Error helper ─────────────────────────────────────────────────────────────

/**
 * Convert a GeolocationPositionError code into a human-readable string
 * suitable for display in the UI.
 */
function describePositionError(err: GeolocationPositionError): string {
    switch (err.code) {
        case err.PERMISSION_DENIED:
            return 'Location access was denied. Please enable location permissions in your browser settings.';
        case err.POSITION_UNAVAILABLE:
            return 'Your position could not be determined. Please check your device GPS settings.';
        case err.TIMEOUT:
            return 'Location request timed out. Make sure you have a clear GPS signal and try again.';
        default:
            return 'An unknown error occurred while retrieving your location.';
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

const GeolocationControl: React.FC = () => {
    const map = useMap();

    // ── Leaflet object refs ───────────────────────────────────────────────────
    //
    // All Leaflet objects are managed imperatively via refs rather than React
    // state. This prevents unnecessary re-renders on every position update and
    // keeps Leaflet's own internal state as the single source of truth for the
    // map layer.

    /** The location dot currently on the map, if any. */
    const markerRef = useRef<L.Marker | null>(null);

    /** The accuracy circle currently on the map, if any. */
    const accuracyCircleRef = useRef<L.Circle | null>(null);

    /** ID returned by watchPosition — needed to cancel the watch on unmount. */
    const watchIdRef = useRef<number | null>(null);

    /** Most recent position, kept in a ref so the Leaflet button callback
     *  always reads the live value. */
    const currentLatLngRef = useRef<L.LatLng | null>(null);

    /** The locate button element, so its enabled state and tooltip can reflect errors. */
    const buttonRef = useRef<HTMLAnchorElement | null>(null);

    // ── React state (UI feedback only) ────────────────────────────────────────

    const [locationError, setLocationError] = useState<string | null>(null);

    // ── Marker management ─────────────────────────────────────────────────────

    /**
     * Create or update the location dot and accuracy circle on the map.
     * Creating on first call; mutating on subsequent calls avoids flicker.
     */
    const upsertLocationLayer = useCallback((
        latlng:          L.LatLng,
        accuracyMetres:  number,
    ): void => {
        currentLatLngRef.current = latlng;

        // ── Location dot ──────────────────────────────────────────────────────
        if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
        } else {
            markerRef.current = L.marker(latlng, {
                icon:         LOCATION_DOT_ICON,
                zIndexOffset: 1000,
                interactive:  false,  // clicks pass through to the map
                keyboard:     false,  // not a focus stop: it has no action
            }).addTo(map);
        }

        // ── Accuracy circle ───────────────────────────────────────────────────
        if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng(latlng);
            accuracyCircleRef.current.setRadius(accuracyMetres);
        } else {
            accuracyCircleRef.current = L.circle(latlng, {
                radius:      accuracyMetres,
                color:       MARKER_COLOUR,
                fillColor:   MARKER_COLOUR,
                fillOpacity: 0.12,
                weight:      1.5,
                interactive: false,
            }).addTo(map);
        }
    }, [map]);

    // ── Geolocation callbacks ─────────────────────────────────────────────────

    const onPosition = useCallback((position: GeolocationPosition): void => {
        const { latitude, longitude, accuracy } = position.coords;
        const latlng = L.latLng(latitude, longitude);

        setLocationError(null);
        upsertLocationLayer(latlng, accuracy);
    }, [upsertLocationLayer]);

    const onPositionError = useCallback((err: GeolocationPositionError): void => {
        const message = describePositionError(err);
        console.warn('[GeolocationControl]', message);
        setLocationError(message);
    }, []);

    // ── Re-centre logic ───────────────────────────────────────────────────────

    const recenter = useCallback((): void => {
        if (currentLatLngRef.current) {
            map.setView(currentLatLngRef.current, RECENTER_ZOOM);
        }
    }, [map]);

    // ── Start geolocation tracking ────────────────────────────────────────────

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        // Begin continuous position watching immediately.
        watchIdRef.current = navigator.geolocation.watchPosition(
            onPosition,
            onPositionError,
            WATCH_OPTIONS,
        );

        // ── Cleanup on unmount ────────────────────────────────────────────────
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }

            markerRef.current?.remove();
            markerRef.current = null;

            accuracyCircleRef.current?.remove();
            accuracyCircleRef.current = null;
        };
    }, [onPosition, onPositionError]);

    // ── Add Leaflet control button ────────────────────────────────────────────

    useEffect(() => {
        // Crosshair/locate SVG icon — matches Leaflet's default control icon size.
        const buttonIcon = `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16" height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2"  x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2"  y1="12" x2="6"  y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
        `.trim();

        // Extend L.Control to create a custom Leaflet control that sits neatly
        // below the built-in zoom buttons in the top-right corner.
        const LocateControl = L.Control.extend({
            options: { position: 'topright' as L.ControlPosition },

            onAdd(): HTMLElement {
                // leaflet-bar gives the container the same rounded-border styling
                // as the zoom control so the two appear as a cohesive group.
                const container = L.DomUtil.create(
                    'div',
                    'leaflet-bar leaflet-control leaflet-control-locate',
                );

                const button = L.DomUtil.create('a', '', container) as HTMLAnchorElement;
                button.href  = '#';
                button.title = LOCATE_BUTTON_TITLE;
                button.setAttribute('role',       'button');
                button.setAttribute('aria-label', LOCATE_BUTTON_TITLE);
                button.innerHTML = buttonIcon;
                buttonRef.current = button;

                // Prevent map drag/click events firing when the user interacts
                // with the control.
                L.DomEvent.disableClickPropagation(container);

                L.DomEvent.on(button, 'click', (e: Event) => {
                    L.DomEvent.preventDefault(e);
                    recenter();
                });

                return container;
            },
        });

        const control = new LocateControl();
        map.addControl(control);

        return () => {
            buttonRef.current = null;
            map.removeControl(control);
        };
        // `recenter` only changes when `map` does, so the control is built once per map.
    }, [map, recenter]);

    // ── Error display ─────────────────────────────────────────────────────────

    // Reflect the error on the locate button: disabled with the reason as tooltip.
    useEffect(() => {
        const button = buttonRef.current;
        if (!button) {
            return;
        }

        if (locationError) {
            button.classList.add('leaflet-disabled');
            button.setAttribute('aria-disabled', 'true');
            button.title = locationError;
        } else {
            button.classList.remove('leaflet-disabled');
            button.removeAttribute('aria-disabled');
            button.title = LOCATE_BUTTON_TITLE;
        }
    }, [locationError]);

    // This component has no React-rendered DOM output. All visible elements
    // (marker, accuracy circle, control button) are managed imperatively via
    // the Leaflet API inside the effects above.
    return null;
};

export { GeolocationControl };
