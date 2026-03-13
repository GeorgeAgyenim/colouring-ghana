/**
 * GeolocationControl
 *
 * A self-contained real-time geolocation feature for Colouring Cities.
 *
 * Behaviour:
 *  - Starts tracking the user's position automatically when mounted.
 *  - Renders a directional arrow marker with an accuracy circle on the map.
 *  - Uses the DeviceOrientation API for compass heading; falls back to the
 *    heading value supplied by the Geolocation API when unavailable.
 *  - Adds a "Go to my location" button below the Leaflet zoom controls.
 *    Clicking it re-centres the map to the user's current live position.
 *
 * Portability (for forks):
 *  1. Copy this file into your fork at app/src/frontend/map/geolocation-control.tsx
 *  2. Inside your map component (the one that renders <MapContainer>), add:
 *       import { GeolocationControl } from './map/geolocation-control';
 *     and place <GeolocationControl /> anywhere inside <MapContainer>.
 *  No other files need to be changed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Zoom level used when re-centring the map on the user's position.
 * 17 is street level — close enough to identify individual buildings.
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

/** Colour used consistently for the marker arrow and accuracy circle. */
const MARKER_COLOUR = '#1a6de0';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * DeviceOrientationEvent extended with the non-standard webkitCompassHeading
 * property that iOS Safari exposes.
 */
interface DeviceOrientationEventWithCompass extends DeviceOrientationEvent {
    webkitCompassHeading?: number;
}

/**
 * DeviceOrientationEvent constructor extended with the iOS 13+ static
 * requestPermission method.
 */
interface DeviceOrientationEventConstructorWithPermission {
    new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
    requestPermission?(): Promise<'granted' | 'denied'>;
}

// ─── Icon factory ─────────────────────────────────────────────────────────────

/**
 * Build a Leaflet DivIcon containing an SVG directional arrow.
 *
 * The arrow always points "up" in SVG space. A CSS transform rotates the
 * wrapping div to align the arrow with the supplied compass heading (degrees
 * clockwise from true north).
 */
function buildArrowIcon(headingDeg: number): L.DivIcon {
    const SIZE   = 32;
    const CENTRE = SIZE / 2;

    // The arrowhead points north (up). The tail widens slightly to suggest
    // direction clearly even at small sizes.
    const arrowSvg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${SIZE}"
            height="${SIZE}"
            viewBox="0 0 ${SIZE} ${SIZE}"
        >
            <polygon
                points="${CENTRE},3 ${CENTRE - 7},${SIZE - 5} ${CENTRE},${SIZE - 11} ${CENTRE + 7},${SIZE - 5}"
                fill="${MARKER_COLOUR}"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linejoin="round"
            />
        </svg>
    `.trim();

    return L.divIcon({
        // Empty string suppresses Leaflet's default white-box background class.
        className: '',
        html: `
            <div style="
                width:            ${SIZE}px;
                height:           ${SIZE}px;
                transform:        rotate(${headingDeg}deg);
                transform-origin: center center;
                will-change:      transform;
            ">
                ${arrowSvg}
            </div>
        `.trim(),
        iconSize:   [SIZE, SIZE],
        iconAnchor: [CENTRE, CENTRE],
    });
}

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

    /** The directional arrow marker currently on the map, if any. */
    const markerRef = useRef<L.Marker | null>(null);

    /** The accuracy circle currently on the map, if any. */
    const accuracyCircleRef = useRef<L.Circle | null>(null);

    /** ID returned by watchPosition — needed to cancel the watch on unmount. */
    const watchIdRef = useRef<number | null>(null);

    /** Most recent position, kept in a ref so the Leaflet button callback
     *  always reads the live value without stale-closure issues. */
    const currentLatLngRef = useRef<L.LatLng | null>(null);

    /** Most recent compass heading in degrees clockwise from north. */
    const headingRef = useRef<number>(0);

    /**
     * Stable ref to the re-centre function. Because the Leaflet control button
     * is created imperatively (outside React's render cycle), it cannot receive
     * updated props or hook values. Storing the function in a ref and calling
     * recenterRef.current() instead ensures the button always invokes the
     * latest version without recreating the Leaflet control on every render.
     */
    const recenterRef = useRef<() => void>(() => undefined);

    // ── React state (UI feedback only) ────────────────────────────────────────

    const [locationError, setLocationError] = useState<string | null>(null);

    // ── Marker management ─────────────────────────────────────────────────────

    /**
     * Create or update the arrow marker and accuracy circle on the map.
     * Creating on first call; mutating on subsequent calls avoids flicker.
     */
    const upsertLocationLayer = useCallback((
        latlng:          L.LatLng,
        accuracyMetres:  number,
        headingDeg:      number,
    ): void => {
        currentLatLngRef.current = latlng;

        // ── Arrow marker ──────────────────────────────────────────────────────
        if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
            markerRef.current.setIcon(buildArrowIcon(headingDeg));
        } else {
            markerRef.current = L.marker(latlng, {
                icon:         buildArrowIcon(headingDeg),
                zIndexOffset: 1000,
                interactive:  false,  // clicks pass through to the map
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
        const { latitude, longitude, accuracy, heading: geoHeading } = position.coords;
        const latlng = L.latLng(latitude, longitude);

        // Prefer the device-orientation heading (updated continuously by the
        // compass); fall back to the heading the Geolocation API provides
        // (only meaningful when the device is physically moving).
        const heading = headingRef.current
            ?? (geoHeading !== null ? geoHeading : 0);

        setLocationError(null);
        upsertLocationLayer(latlng, accuracy, heading);
    }, [upsertLocationLayer]);

    const onPositionError = useCallback((err: GeolocationPositionError): void => {
        setLocationError(describePositionError(err));
    }, []);

    // ── Device orientation (compass heading) ──────────────────────────────────

    const onDeviceOrientation = useCallback((evt: DeviceOrientationEventWithCompass): void => {
        // iOS Safari provides webkitCompassHeading: degrees clockwise from north (0-360).
        // Android provides alpha: degrees anticlockwise from north, so we invert it.
        const heading: number | null = evt.webkitCompassHeading != null
            ? evt.webkitCompassHeading
            : evt.alpha != null
                ? (360 - evt.alpha) % 360
                : null;

        if (heading === null) return;

        headingRef.current = heading;

        // Rotate the existing marker icon in place — no position update needed.
        if (markerRef.current) {
            markerRef.current.setIcon(buildArrowIcon(heading));
        }
    }, []);

    // ── Re-centre logic ───────────────────────────────────────────────────────

    const recenter = useCallback((): void => {
        if (currentLatLngRef.current) {
            map.setView(currentLatLngRef.current, RECENTER_ZOOM);
        }
    }, [map]);

    // Keep the stable ref pointing at the latest version of recenter so the
    // imperatively-created Leaflet button always calls the current map instance.
    useEffect(() => {
        recenterRef.current = recenter;
    }, [recenter]);

    // ── Start geolocation + orientation tracking ──────────────────────────────

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

        // Attach the device-orientation listener.
        // iOS 13+ requires an explicit permission request, which must originate
        // from a user gesture. We piggyback on the first recenter button click.
        const DeviceOrientation = DeviceOrientationEvent as unknown as
            DeviceOrientationEventConstructorWithPermission;

        const attachOrientationListener = (): void => {
            window.addEventListener('deviceorientation', onDeviceOrientation as EventListener, true);
        };

        if (typeof DeviceOrientation.requestPermission === 'function') {
            // iOS 13+: wrap the current recenter function so that the first
            // click both requests permission and re-centres the map.
            const originalRecenter = recenterRef.current;

            recenterRef.current = (): void => {
                originalRecenter();

                DeviceOrientation.requestPermission!()
                    .then(result => {
                        if (result === 'granted') attachOrientationListener();
                    })
                    .catch(() => {
                        // Permission denied or API error — heading gracefully
                        // falls back to the GPS-supplied value.
                    })
                    .finally(() => {
                        // Restore the plain recenter for all subsequent clicks.
                        recenterRef.current = originalRecenter;
                    });
            };
        } else {
            // All other browsers: attach the listener directly.
            attachOrientationListener();
        }

        // ── Cleanup on unmount ────────────────────────────────────────────────
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }

            window.removeEventListener('deviceorientation', onDeviceOrientation as EventListener, true);

            markerRef.current?.remove();
            markerRef.current = null;

            accuracyCircleRef.current?.remove();
            accuracyCircleRef.current = null;
        };
    }, [onPosition, onPositionError, onDeviceOrientation]);

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
                button.title = 'Go to my location';
                button.setAttribute('role',       'button');
                button.setAttribute('aria-label', 'Go to my location');
                button.innerHTML = buttonIcon;

                // Prevent map drag/click events firing when the user interacts
                // with the control.
                L.DomEvent.disableClickPropagation(container);

                L.DomEvent.on(button, 'click', (e: Event) => {
                    L.DomEvent.preventDefault(e);
                    // Always call via the ref so we never hold a stale closure.
                    recenterRef.current();
                });

                return container;
            },
        });

        const control = new LocateControl();
        map.addControl(control);

        return () => {
            map.removeControl(control);
        };
        // `map` is the only true dependency. The button handler deliberately
        // calls recenterRef.current (not recenter directly) to avoid this
        // effect re-running — and recreating the Leaflet control — whenever
        // the recenter callback reference changes.
    }, [map]);

    // ── Error display ─────────────────────────────────────────────────────────

    // Log errors in development. In production, wire this to your application's
    // notification or toast system — e.g. replace the console.warn below with
    // a call to your existing error-display utility.
    if (locationError) {
        console.warn('[GeolocationControl]', locationError);
    }

    // This component has no React-rendered DOM output. All visible elements
    // (marker, accuracy circle, control button) are managed imperatively via
    // the Leaflet API inside the effects above.
    return null;
};

export { GeolocationControl };