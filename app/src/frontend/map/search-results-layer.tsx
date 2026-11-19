/**
 * SearchResultsLayer
 *
 * Renders a drop-pin marker for each search result on the map, fits the map to
 * show all of them, and emphasises the pin the user is hovering in the results
 * list. Clicking a pin selects that result (same as clicking the list item).
 *
 * Markers use a distinct teardrop "drop pin" so they are not confused with the
 * geolocation control's location dot. Leaflet objects are managed
 * imperatively via refs (mirroring geolocation-control.tsx) to avoid re-render
 * churn.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { SearchResult } from './search-box';

/**
 * Pin colours. Orange stays clearly apart from the blue location dot
 * (MARKER_COLOUR in geolocation-control.tsx); the hovered pin turns red so it
 * stands out from the rest.
 */
const PIN_COLOUR = '#F06A1D';
const PIN_COLOUR_HIGHLIGHT = '#E5484D';
const PIN_OUTLINE_COLOUR = '#FFFFFF';

/**
 * Teardrop outline and body, in a 64 by 102 drawing. The body has a round
 * hole (even-odd fill), so the map shows through the centre and nothing is
 * drawn behind the pin. Design source: docs/images/search-pins/ (pin-orange-*.svg,
 * pin-red-*.svg; *-desktop and *-mobile give the two sizes).
 */
const PIN_VIEWBOX_WIDTH = 64;
const PIN_VIEWBOX_HEIGHT = 102;
const PIN_OUTLINE_PATH = 'M32 2A30 30 0 0 1 58.88 45.31L33.35 96.91Q32 99.6 30.65 96.91L5.12 45.31A30 30 0 0 1 32 2Z';
const PIN_HOLE_PATH = 'M32 15.5A16.5 16.5 0 1 0 32 48.5A16.5 16.5 0 1 0 32 15.5Z';
/** Height of the pin's tip in the drawing: the lowest point of its rounded end. */
const PIN_TIP_Y = 98.26;

/** Mouse-sized pin, and the larger pin used for touch screens and for the hovered result. */
const PIN_SIZE_SMALL = { width: 32, height: 51, outline: 3 };
const PIN_SIZE_LARGE = { width: 40, height: 64, outline: 4 };

interface SearchResultsLayerProps {
    results: SearchResult[];
    hoveredId: number | null;
    onSelect: (result: SearchResult) => void;
}

/** True on touch screens, where pins are drawn larger to be easy to tap. */
function hasCoarsePointer(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Build a teardrop drop-pin DivIcon. The highlighted variant is larger and
 * red so a hovered result "pops out" from the rest.
 */
function buildDropPinIcon(highlighted: boolean, coarsePointer: boolean): L.DivIcon {
    const { width, height, outline } = (highlighted || coarsePointer) ? PIN_SIZE_LARGE : PIN_SIZE_SMALL;
    const colour = highlighted ? PIN_COLOUR_HIGHLIGHT : PIN_COLOUR;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
            viewBox="0 0 ${PIN_VIEWBOX_WIDTH} ${PIN_VIEWBOX_HEIGHT}" aria-hidden="true" focusable="false">
            <path d="${PIN_OUTLINE_PATH}" fill="none" stroke="${PIN_OUTLINE_COLOUR}" stroke-width="${outline}"
                stroke-linejoin="round" />
            <path d="${PIN_OUTLINE_PATH}${PIN_HOLE_PATH}" fill="${colour}" fill-rule="evenodd" />
        </svg>
    `.trim();

    return L.divIcon({
        // Replaces Leaflet's default white-box class.
        className: '',
        html: svg,
        iconSize: [width, height],
        // anchor at the tip of the teardrop
        iconAnchor: [width / 2, Math.round(height * PIN_TIP_Y / PIN_VIEWBOX_HEIGHT)],
    });
}

export const SearchResultsLayer: React.FC<SearchResultsLayerProps> = ({ results, hoveredId, onSelect }) => {
    const map = useMap();

    /** Active markers keyed by result id. */
    const markersRef = useRef<Map<number, L.Marker>>(new Map());

    /** Latest onSelect, kept in a ref so marker click handlers never go stale. */
    const onSelectRef = useRef(onSelect);
    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

    // Rebuild markers and fit the map whenever the result set changes.
    useEffect(() => {
        // Remove previous markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current.clear();

        if (results.length === 0) return;

        const latlngs: L.LatLng[] = [];
        const coarsePointer = hasCoarsePointer();

        results.forEach(result => {
            const [lng, lat] = result.geometry.coordinates;
            const latlng = L.latLng(lat, lng);
            latlngs.push(latlng);

            const marker = L.marker(latlng, {
                icon: buildDropPinIcon(false, coarsePointer),
                zIndexOffset: 500,
                title: result.attributes.label,
            })
                .addTo(map)
                .on('click', () => onSelectRef.current(result));

            markersRef.current.set(result.id, marker);
        });

        // Frame all results; a single result flies to its own zoom level.
        if (latlngs.length === 1) {
            map.setView(latlngs[0], results[0].attributes.zoom);
        } else {
            map.fitBounds(L.latLngBounds(latlngs), {
                paddingTopLeft: [80, 80],
                paddingBottomRight: [80, 80],
                maxZoom: 16,
            });
        }

        return () => {
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current.clear();
        };
    }, [results, map]);

    // Emphasise the hovered marker without rebuilding the whole set. Re-run
    // when the result set changes too, since freshly built markers start
    // un-highlighted.
    useEffect(() => {
        const coarsePointer = hasCoarsePointer();
        markersRef.current.forEach((marker, id) => {
            const highlighted = id === hoveredId;
            marker.setIcon(buildDropPinIcon(highlighted, coarsePointer));
            marker.setZIndexOffset(highlighted ? 1500 : 500);
        });
    }, [hoveredId, results]);

    return null;
};
