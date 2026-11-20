/**
 * The box over the map that holds short messages: "could not load the
 * district boundaries", "location is off for this site". Every message on a
 * map shares it, so two messages sit one above the other rather than on top
 * of each other. It is a plain element in the map's container, not a map
 * layer, so it stays put when the map is moved. It is made the first time a
 * message is needed and stays with the map; while empty it takes up no room.
 *
 * Each message is rendered into it with a React portal, as an element with
 * the `map-message` class (styled in map-messages.css).
 *
 * Tickets: docs/tickets/location-search/issues/12-boundary-download-failure-is-shown.md,
 * docs/tickets/location-search/issues/06-ask-for-location-on-tap.md
 */
import L from 'leaflet';

import './map-messages.css';

const MESSAGE_BOX_CLASS = 'map-messages';

export function getMapMessageBox(map: L.Map): HTMLElement {
    const mapContainer = map.getContainer();
    let box = mapContainer.querySelector<HTMLElement>(`.${MESSAGE_BOX_CLASS}`);
    if (box === null) {
        box = L.DomUtil.create('div', MESSAGE_BOX_CLASS, mapContainer);
        // Pressing a button in a message must not also click the map
        // underneath, which would select a building. Same for dragging and
        // scrolling on the box.
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
    }
    return box;
}
