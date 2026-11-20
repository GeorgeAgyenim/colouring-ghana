/**
 * GeolocationControl
 *
 * Real-time geolocation for the map.
 *
 * Behaviour:
 *  - Adds a "Go to my location" button below the Leaflet zoom controls.
 *    Nothing asks for the position until the person taps it. The first tap
 *    starts watching the position; the button pulses until the first
 *    position comes, and the map then centres on it. Later taps centre the
 *    map on the live position.
 *  - Renders a dot with an accuracy circle on the map. There is no direction
 *    arrow: a compass heading is not reliable across phones, and a dot is
 *    never wrong (docs/tickets/location-search/issues/05-location-marker-plain-dot.md).
 *  - If no position comes (refused, location off, too slow), a message over
 *    the map says "Your location could not be found." with "Learn more",
 *    which opens a pop-up with what to try (location-help.tsx). The button
 *    stays usable: tapping it again tries again.
 *  - While the page is hidden the watch stops, so the GPS can turn off, and
 *    it starts again when the page is shown.
 *
 * Ticket: docs/tickets/location-search/issues/06-ask-for-location-on-tap.md
 * Ticket: docs/tickets/location-search/issues/26-location-off-reads-as-slow.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { LocationHelp } from './location-help';
import { getMapMessageBox } from './map-messages';

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
 *
 * The timeout counts from when the person allows location, not from the tap.
 * A timeout before the first position ends the attempt with a message, so it
 * is set long enough for a phone whose GPS was off to get its first
 * fix, which commonly takes more than 10 s. While tracking, a timeout is
 * ignored and the watch carries on.
 */
const WATCH_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 1_000,   // accept a cached fix up to 1 s old
    timeout:    30_000,  // fire onError after 30 s without a fix
};

/** Colour of the location dot and accuracy circle. map.css gives the pulsing locate button the same blue. */
const MARKER_COLOUR = '#1a6de0';

const LOCATE_BUTTON_TITLE = 'Go to my location';

/** Class on the locate button while the first position is being found; the stylesheet pulses it. */
const LOCATING_CLASS = 'locating';

/**
 * The message for every failure. Browsers do not report the cause reliably, so
 * the message does not guess one; "Learn more" lists them all.
 */
const FAILURE_MESSAGE = 'Your location could not be found.';

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

    /** The locate button element, so its pulse can be switched on and off. */
    const buttonRef = useRef<HTMLAnchorElement | null>(null);

    /** True from a tap that started the watch until its first position, which centres the map. */
    const centreOnNextPositionRef = useRef(false);

    /** True while the watch is stopped only because the page is hidden; it restarts when the page is shown. */
    const pausedRef = useRef(false);

    /** The latest tap handler, read by the Leaflet button's click listener. */
    const onLocateTapRef = useRef<() => void>(() => undefined);

    // ── React state (UI feedback only) ────────────────────────────────────────

    /**
     * What the person sees after no position came: nothing, the message over
     * the map, or the message with its "Learn more" pop-up open on top.
     */
    const [failureShown, setFailureShown] = useState<'none' | 'message' | 'help'>('none');

    /** "Learn more", so focus can go back to it when the pop-up closes. */
    const learnMoreRef = useRef<HTMLButtonElement>(null);

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

    const removeLocationLayer = useCallback((): void => {
        currentLatLngRef.current = null;

        markerRef.current?.remove();
        markerRef.current = null;

        accuracyCircleRef.current?.remove();
        accuracyCircleRef.current = null;
    }, []);

    // ── Geolocation callbacks ─────────────────────────────────────────────────

    const stopWatching = useCallback((): void => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    /** Show or end the button's "finding your position" pulse. */
    const showLocatingPulse = useCallback((locating: boolean): void => {
        buttonRef.current?.classList.toggle(LOCATING_CLASS, locating);
    }, []);

    const onPosition = useCallback((position: GeolocationPosition): void => {
        const { latitude, longitude, accuracy } = position.coords;
        const latlng = L.latLng(latitude, longitude);

        upsertLocationLayer(latlng, accuracy);

        // The first position after a tap answers that tap: take the person there.
        if (centreOnNextPositionRef.current) {
            centreOnNextPositionRef.current = false;
            showLocatingPulse(false);
            map.setView(latlng, RECENTER_ZOOM);
        }
    }, [map, upsertLocationLayer, showLocatingPulse]);

    /**
     * While answering a tap, any failure ends the attempt and says so; the
     * next tap tries again. Once tracking, a slow or lost fix is not worth
     * interrupting the person for: the watch keeps trying and the dot stays at
     * its last place. Losing permission while tracking ends it, and the dot
     * goes with it, since it would no longer follow the person.
     */
    const onPositionError = useCallback((err: GeolocationPositionError): void => {
        const lostPermission = err.code === err.PERMISSION_DENIED;
        if (!centreOnNextPositionRef.current && !lostPermission) {
            return;
        }

        stopWatching();
        centreOnNextPositionRef.current = false;
        showLocatingPulse(false);
        if (lostPermission) {
            removeLocationLayer();
        }
        setFailureShown('message');
    }, [stopWatching, showLocatingPulse, removeLocationLayer]);

    // ── Watching ──────────────────────────────────────────────────────────────

    const startWatching = useCallback((): void => {
        pausedRef.current = false;
        watchIdRef.current = navigator.geolocation.watchPosition(
            onPosition,
            onPositionError,
            WATCH_OPTIONS,
        );
    }, [onPosition, onPositionError]);

    // ── The button ────────────────────────────────────────────────────────────

    /**
     * The first tap asks for the position and centres the map when it comes;
     * later taps centre the map on the live position.
     */
    const onLocateTap = useCallback((): void => {
        if (!navigator.geolocation) {
            setFailureShown('message');
            return;
        }
        if (watchIdRef.current === null) {
            // A new attempt: the reason the last one failed no longer applies.
            setFailureShown('none');
            centreOnNextPositionRef.current = true;
            showLocatingPulse(true);
            startWatching();
        } else if (currentLatLngRef.current) {
            map.setView(currentLatLngRef.current, RECENTER_ZOOM);
        }
        // Otherwise the watch is running and its first position will centre the map.
    }, [map, startWatching, showLocatingPulse]);

    // Taps only come after the first render is committed, so the ref is set in time.
    useEffect(() => {
        onLocateTapRef.current = onLocateTap;
    }, [onLocateTap]);

    // ── Pause while the page is hidden ────────────────────────────────────────

    /**
     * A hidden page (another tab or app, the screen off) has no use for the
     * position, and a running watch keeps the phone's GPS on. Stop it, leaving
     * the dot where it was, and start it again when the page is shown. That
     * restart needs no tap: the person already asked, and the browser already
     * has their answer. A tap still waiting for its first position still
     * centres the map when the position comes.
     */
    useEffect(() => {
        const onVisibilityChange = (): void => {
            if (document.visibilityState === 'hidden') {
                if (watchIdRef.current !== null) {
                    stopWatching();
                    pausedRef.current = true;
                }
            } else if (pausedRef.current) {
                startWatching();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [startWatching, stopWatching]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────

    useEffect(() => () => {
        stopWatching();
        removeLocationLayer();
    }, [stopWatching, removeLocationLayer]);

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
                    onLocateTapRef.current();
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
        // The click reads the tap handler through a ref, so the control is built once per map.
    }, [map]);

    // ── Error display ─────────────────────────────────────────────────────────

    /** Close the pop-up and put focus back on the "Learn more" that opened it. */
    const closeHelp = useCallback((): void => {
        setFailureShown('message');
        learnMoreRef.current?.focus();
    }, []);

    // The marker, accuracy circle and button are Leaflet objects managed in the
    // effects above. The only React output is the message, in the box over the
    // map that the boundary layers' messages share, and its "Learn more" pop-up.
    if (failureShown === 'none') {
        return null;
    }
    return (<>
        {ReactDOM.createPortal(
            <div className="map-message map-message-dismissible alert alert-warning" role="alert">
                <span>
                    {FAILURE_MESSAGE}{' '}
                    {/* Looks like a link; a button underneath, since it opens a pop-up rather than a page. */}
                    <button
                        ref={learnMoreRef}
                        className="map-message-link"
                        type="button"
                        onClick={() => setFailureShown('help')}
                    >
                        Learn more
                    </button>
                </span>
                <button
                    className="btn-close"
                    type="button"
                    aria-label="Close"
                    onClick={() => setFailureShown('none')}
                />
            </div>,
            getMapMessageBox(map)
        )}
        {failureShown === 'help' && <LocationHelp onClose={closeHelp} />}
    </>);
};

export { GeolocationControl };
