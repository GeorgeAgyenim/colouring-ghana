/**
 * SearchResultsLayer
 *
 * Renders a drop-pin marker for each search result on the map, fits the map to
 * show all of them, and emphasises the pin the user is hovering in the results
 * list. Clicking a pin selects that result (same as clicking the list item).
 *
 * Markers use a distinct teardrop "drop pin" so they are not confused with the
 * geolocation control's directional arrow. Leaflet objects are managed
 * imperatively via refs (mirroring geolocation-control.tsx) to avoid re-render
 * churn.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { SearchResult } from './search-box';

/** Colour for search drop-pins — deliberately different from the geolocation arrow (#1a6de0). */
const PIN_COLOUR = '#e8590c';
const PIN_COLOUR_HIGHLIGHT = '#c92a2a';

interface SearchResultsLayerProps {
    results: SearchResult[];
    hoveredId: number | null;
    onSelect: (result: SearchResult) => void;
}

/**
 * Build a teardrop drop-pin DivIcon. The highlighted variant is larger and
 * darker so a hovered result "pops out" from the rest.
 */
function buildDropPinIcon(highlighted: boolean): L.DivIcon {
    const width = highlighted ? 30 : 24;
    const height = highlighted ? 45 : 36;
    const colour = highlighted ? PIN_COLOUR_HIGHLIGHT : PIN_COLOUR;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 36">
            <path
                d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 36 12 36 S24 21 24 12 C24 5.4 18.6 0 12 0 Z"
                fill="${colour}" stroke="#ffffff" stroke-width="1.5" />
            <circle cx="12" cy="12" r="4" fill="#ffffff" />
        </svg>
    `.trim();

    return L.divIcon({
        className: '',
        html: svg,
        iconSize: [width, height],
        // anchor at the tip of the teardrop (bottom-centre)
        iconAnchor: [width / 2, height],
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

        results.forEach(result => {
            const [lng, lat] = result.geometry.coordinates;
            const latlng = L.latLng(lat, lng);
            latlngs.push(latlng);

            const marker = L.marker(latlng, {
                icon: buildDropPinIcon(false),
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

    // Emphasise the hovered marker without rebuilding the whole set.
    useEffect(() => {
        markersRef.current.forEach((marker, id) => {
            const highlighted = id === hoveredId;
            marker.setIcon(buildDropPinIcon(highlighted));
            marker.setZIndexOffset(highlighted ? 1500 : 500);
        });
    }, [hoveredId]);

    return null;
};
