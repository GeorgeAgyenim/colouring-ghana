import { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';
import { GeoJSON, useMap, useMapEvent } from 'react-leaflet';
import { useDisplayPreferences } from '../../displayPreferences-context';
import { apiGet } from '../../apiHelpers';

// Region names read well at country/region scale but clutter closer views,
// where the district labels take over (see district-boundary-layer.tsx).
const REGION_LABEL_MAX_ZOOM = 11;

export function RegionBoundaryLayer() {
    const [boundaryGeojson, setBoundaryGeojson] = useState<GeoJsonObject>(null);
    const { region } = useDisplayPreferences();
    const layerRef = useRef<L.GeoJSON>(null);

    const map = useMap();
    const [showLabels, setShowLabels] = useState(map.getZoom() <= REGION_LABEL_MAX_ZOOM);
    useMapEvent('zoomend', () => setShowLabels(map.getZoom() <= REGION_LABEL_MAX_ZOOM));

    useEffect(() => {
        apiGet('/geometries/Gh_adm_bnd_L1.geojson')
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
    }, [region, boundaryGeojson, showLabels]);

    if(region == "enabled") {
        return boundaryGeojson &&
        <GeoJSON
            ref={layerRef}
            attribution='Regional boundaries from <a href=https://data.humdata.org/dataset/cod-ab-gha>Ghana administrative boundaries (OCHA/GSS)</a>'
            data={boundaryGeojson}
            style={{color: '#e05a00', fill: false, weight: 2, opacity: 1}}
            onEachFeature={(feature, layer) => {
                const name = feature?.properties?.ADM1_EN;
                if (name) {
                    layer.bindTooltip(name, {
                        permanent: true,
                        direction: 'center',
                        className: 'boundary-label region-label',
                    });
                }
            }}
        />;
    } else {
        return <></>
    }
}
