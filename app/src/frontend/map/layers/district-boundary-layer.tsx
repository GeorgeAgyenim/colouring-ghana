import { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';
import { GeoJSON, useMap, useMapEvent } from 'react-leaflet';
import { useDisplayPreferences } from '../../displayPreferences-context';
import { apiGet } from '../../apiHelpers';

// 261 districts would be unreadable at country scale, so their labels only
// appear once zoomed in far enough that just a handful are in view — taking
// over from the region labels (see region-boundary-layer.tsx).
const DISTRICT_LABEL_MIN_ZOOM = 12;

export function DistrictBoundaryLayer() {
    const [boundaryGeojson, setBoundaryGeojson] = useState<GeoJsonObject>(null);
    const { district } = useDisplayPreferences();
    const layerRef = useRef<L.GeoJSON>(null);

    const map = useMap();
    const [showLabels, setShowLabels] = useState(map.getZoom() >= DISTRICT_LABEL_MIN_ZOOM);
    useMapEvent('zoomend', () => setShowLabels(map.getZoom() >= DISTRICT_LABEL_MIN_ZOOM));

    useEffect(() => {
        apiGet('/geometries/Gh_adm_bnd_L2.geojson')
            .then(data => setBoundaryGeojson(data as GeoJsonObject));
    }, []);

    // Permanent tooltips auto-open whenever their layer is added to the map,
    // so re-sync them with the zoom rule after every render that could
    // (re-)add the layer, as well as on zoom changes.
    useEffect(() => {
        layerRef.current?.eachLayer(layer => {
            if (showLabels) {
                layer.openTooltip();
            } else {
                layer.closeTooltip();
            }
        });
    }, [district, boundaryGeojson, showLabels]);

    if(district == "enabled") {
        return boundaryGeojson &&
        <GeoJSON
            ref={layerRef}
            attribution='District (MMDA) boundaries from <a href=https://data.humdata.org/dataset/cod-ab-gha>Ghana administrative boundaries (OCHA/GSS)</a>'
            data={boundaryGeojson}
            style={{color: '#888', fill: false, weight: 1, opacity: 1}}
            onEachFeature={(feature, layer) => {
                const name = feature?.properties?.labels;
                if (name) {
                    layer.bindTooltip(name, {
                        permanent: true,
                        direction: 'center',
                        className: 'boundary-label district-label',
                    });
                }
            }}
        />;
    } else {
        return <></>
    }
}
