import { GeoJsonObject } from 'geojson';
import type { GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';
import { GeoJSON, useMap, useMapEvent } from 'react-leaflet';

import { apiGet } from '../../apiHelpers';
import { LayerEnablementState } from '../../config/map-config';
import { useDisplayPreferences } from '../../displayPreferences-context';

const BOUNDARY_ATTRIBUTION = 'Administrative boundaries from <a href=https://data.humdata.org/dataset/cod-ab-gha>Ghana administrative boundaries (OCHA/GSS)</a>';

// Region names read well at country/region scale but clutter closer views,
// where the district labels take over.
const REGION_LABEL_MAX_ZOOM = 11;
// 261 districts would be unreadable at country scale, so their labels only
// appear once zoomed in far enough that just a handful are in view.
const DISTRICT_LABEL_MIN_ZOOM = 12;

interface AdminBoundaryLayerProps {
    enabled: LayerEnablementState;
    /** Path (under public/) of the GeoJSON file to draw. */
    geometryUrl: string;
    /** Feature property holding the name shown as a label. */
    nameProperty: string;
    labelClassName: string;
    showLabelsAtZoom: (zoom: number) => boolean;
    style: PathOptions;
}

/**
 * A toggleable administrative boundary layer with zoom-dependent labels.
 *
 * The GeoJSON is fetched the first time the layer is enabled and then kept in
 * state, so the multi-megabyte files are never downloaded for visitors who
 * never turn the layer on.
 */
function AdminBoundaryLayer({
    enabled,
    geometryUrl,
    nameProperty,
    labelClassName,
    showLabelsAtZoom,
    style,
}: AdminBoundaryLayerProps) {
    const [boundaryGeojson, setBoundaryGeojson] = useState<GeoJsonObject>(null);
    const requestedRef = useRef(false);
    const layerRef = useRef<LeafletGeoJSON>(null);

    const map = useMap();
    const [showLabels, setShowLabels] = useState(showLabelsAtZoom(map.getZoom()));
    useMapEvent('zoomend', () => setShowLabels(showLabelsAtZoom(map.getZoom())));

    useEffect(() => {
        if (enabled !== 'enabled' || requestedRef.current) {
            return;
        }
        requestedRef.current = true;

        let unmounted = false;
        apiGet(geometryUrl)
            .then(data => {
                if (!unmounted) {
                    setBoundaryGeojson(data as GeoJsonObject);
                }
            })
            .catch(err => {
                // Allow a retry on the next enable rather than staying blank for good.
                requestedRef.current = false;
                console.error(`Failed to load boundary layer ${geometryUrl}`, err);
            });

        return () => { unmounted = true; };
    }, [enabled, geometryUrl]);

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
    }, [enabled, boundaryGeojson, showLabels]);

    if (enabled !== 'enabled' || boundaryGeojson === null) {
        return null;
    }

    return (
        <GeoJSON
            ref={layerRef}
            attribution={BOUNDARY_ATTRIBUTION}
            data={boundaryGeojson}
            style={style}
            onEachFeature={(feature, layer) => {
                const name = feature?.properties?.[nameProperty];
                if (name) {
                    layer.bindTooltip(name, {
                        permanent: true,
                        direction: 'center',
                        className: `boundary-label ${labelClassName}`,
                    });
                }
            }}
        />
    );
}

export function RegionBoundaryLayer(): JSX.Element {
    const { region } = useDisplayPreferences();
    return (
        <AdminBoundaryLayer
            enabled={region}
            geometryUrl="/geometries/Gh_adm_bnd_L1.geojson"
            nameProperty="ADM1_EN"
            labelClassName="region-label"
            showLabelsAtZoom={zoom => zoom <= REGION_LABEL_MAX_ZOOM}
            style={{color: '#e05a00', fill: false, weight: 2, opacity: 1}}
        />
    );
}

export function DistrictBoundaryLayer(): JSX.Element {
    const { district } = useDisplayPreferences();
    return (
        <AdminBoundaryLayer
            enabled={district}
            geometryUrl="/geometries/Gh_adm_bnd_L2.geojson"
            nameProperty="labels"
            labelClassName="district-label"
            showLabelsAtZoom={zoom => zoom >= DISTRICT_LABEL_MIN_ZOOM}
            style={{color: '#888', fill: false, weight: 1, opacity: 1}}
        />
    );
}
