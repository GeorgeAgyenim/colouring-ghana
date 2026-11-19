import { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import type { GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { GeoJSON, useMap, useMapEvent } from 'react-leaflet';

import './admin-boundary-layer.css';

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

const FAILURE_BOX_CLASS = 'boundary-load-failures';

/**
 * The box over the map that holds the "could not load" messages. Every
 * boundary layer on a map shares it, so two messages sit one above the other.
 * It is a plain element in the map's container, not a map layer, so it stays
 * put when the map is moved. It is made the first time a message is needed
 * and stays with the map; while empty it takes up no room.
 */
function getFailureBox(map: L.Map): HTMLElement {
    const mapContainer = map.getContainer();
    let box = mapContainer.querySelector<HTMLElement>(`.${FAILURE_BOX_CLASS}`);
    if (box === null) {
        box = L.DomUtil.create('div', FAILURE_BOX_CLASS, mapContainer);
        // Pressing "Try again" must not also click the map underneath, which
        // would select a building. Same for dragging and scrolling on the box.
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
    }
    return box;
}

interface AdminBoundaryLayerProps {
    enabled: LayerEnablementState;
    /** How the failure message names the layer. */
    layerName: 'region' | 'district';
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
 * never turn the layer on. A response that arrives while the layer is switched
 * off is kept too, so switching it back on draws it without a second download.
 *
 * If the download fails, or the answer is not boundary data, the layer says so
 * in a message over the map with a "Try again" button, for as long as it is
 * switched on. Switching it off and on again also tries again.
 */
function AdminBoundaryLayer({
    enabled,
    layerName,
    geometryUrl,
    nameProperty,
    labelClassName,
    showLabelsAtZoom,
    style,
}: AdminBoundaryLayerProps) {
    const [boundaryGeojson, setBoundaryGeojson] = useState<GeoJsonObject>(null);
    const [failed, setFailed] = useState(false);
    // true while a download is on its way; "Try again" says so instead of starting another
    const [downloading, setDownloading] = useState(false);
    const requestedRef = useRef(false);
    const mountedRef = useRef(true);
    // whether the layer is switched on now, read when a download fails
    const enabledRef = useRef(enabled);
    const layerRef = useRef<LeafletGeoJSON>(null);

    const map = useMap();
    const [showLabels, setShowLabels] = useState(showLabelsAtZoom(map.getZoom()));
    useMapEvent('zoomend', () => setShowLabels(showLabelsAtZoom(map.getZoom())));

    // Only removal of the component makes a late response unwanted; switching
    // the layer off does not.
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Starts the download unless one is on its way or the file is already
    // here. Used when the layer is switched on and by the "Try again" button.
    const download = useCallback(() => {
        if (requestedRef.current) {
            return;
        }
        requestedRef.current = true;
        // The message, if shown, stays until the outcome is known: the button
        // keeps the keyboard focus, and a second failure needs no new message.
        setDownloading(true);

        apiGet(geometryUrl)
            .then(data => {
                // apiGet does not look at the HTTP status, so an error written
                // as JSON arrives here as well. Only boundary data is kept.
                if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
                    throw new Error('The answer is not a GeoJSON feature collection');
                }
                if (mountedRef.current) {
                    setBoundaryGeojson(data as GeoJsonObject);
                    setFailed(false);
                    setDownloading(false);
                }
            })
            .catch(err => {
                // Allow another try rather than staying blank for good.
                requestedRef.current = false;
                console.error(`Failed to load boundary layer ${geometryUrl}`, err);
                if (mountedRef.current) {
                    setDownloading(false);
                    // A failure while the layer is switched off is not shown:
                    // switching it on tries again anyway.
                    if (enabledRef.current === 'enabled') {
                        setFailed(true);
                    }
                }
            });
    }, [geometryUrl]);

    useEffect(() => {
        enabledRef.current = enabled;
        if (enabled === 'enabled') {
            download();
        } else {
            // A failure belongs to the switch-on it happened in. Forgetting it
            // when the layer is switched off means the old message is not put
            // back on the map, and announced again, at the next switch-on.
            setFailed(false);
        }
    }, [enabled, download]);

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

    if (enabled !== 'enabled') {
        return null;
    }

    if (failed) {
        return ReactDOM.createPortal(
            <div className="boundary-load-failure alert alert-warning" role="alert">
                Could not load the {layerName} boundaries. Check your connection.
                <button
                    className="btn btn-sm btn-outline-dark"
                    type="button"
                    aria-disabled={downloading}
                    onClick={download}
                >
                    {downloading ? 'Trying again…' : 'Try again'}
                </button>
            </div>,
            getFailureBox(map)
        );
    }

    if (boundaryGeojson === null) {
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
            layerName="region"
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
            layerName="district"
            geometryUrl="/geometries/Gh_adm_bnd_L2.geojson"
            nameProperty="labels"
            labelClassName="district-label"
            showLabelsAtZoom={zoom => zoom >= DISTRICT_LABEL_MIN_ZOOM}
            style={{color: '#888', fill: false, weight: 1, opacity: 1}}
        />
    );
}
