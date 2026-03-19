import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { BuildingMapTileset } from '../../config/tileserver-config';
import { VECTOR_TILE_STYLES, VectorTileFeatureStyle, makeHighlightStyle } from './vector-tile-styles';

const GEOMETRY_ONLY_TILESETS = new Set(['base_light', 'base_night', 'base_night_outlines']);

interface BuildingVectorDataLayerProps {
    tileset:    BuildingMapTileset | 'highlight' | 'number_labels' | 'base_light' | 'base_night' | 'base_night_outlines';
    revisionId: string;
    selectedBuildingId?: number;
    baseTileset?: string;
    geometryVersion?: number | null;
}

const BASE_PANE_Z_INDEX = 100;
const BASE_PANE_NAME = 'cc-vector-base-pane';

const VECTOR_PANE_Z_INDEX = 200;
const VECTOR_PANE_NAME = 'cc-vector-data-pane';

const HIGHLIGHT_PANE_Z_INDEX = 301;
const HIGHLIGHT_PANE_NAME = 'cc-vector-highlight-pane';

const BuildingVectorDataLayer: React.FC<BuildingVectorDataLayerProps> = ({
    tileset,
    revisionId,
    selectedBuildingId,
    baseTileset,
    geometryVersion,
}) => {
    const map = useMap();
    const layerRef = useRef<L.Layer | null>(null);
    const isGeometryOnly = GEOMETRY_ONLY_TILESETS.has(tileset);

    useEffect(() => {
        if (isGeometryOnly && geometryVersion == null) return;

        let cancelled = false;

        import('leaflet.vectorgrid').then(() => {
            if (cancelled) return;

            const isHighlight = tileset === 'highlight';
            const paneName = isHighlight ? HIGHLIGHT_PANE_NAME : isGeometryOnly ? BASE_PANE_NAME : VECTOR_PANE_NAME;
            const paneZ = isHighlight ? HIGHLIGHT_PANE_Z_INDEX : isGeometryOnly ? BASE_PANE_Z_INDEX : VECTOR_PANE_Z_INDEX;

            if (!map.getPane(paneName)) {
                const pane = map.createPane(paneName);
                pane.style.zIndex = String(paneZ);
                pane.style.pointerEvents = 'none';
            }

            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }

            const styleFunction = isHighlight
                ? makeHighlightStyle(selectedBuildingId!, baseTileset ?? '')
                : VECTOR_TILE_STYLES[tileset];

            if (!styleFunction) {
                console.warn(`[BuildingVectorDataLayer] No style defined for tileset: ${tileset}`);
                return;
            }

            const tileUrl = isGeometryOnly
                ? `/tiles/${tileset}/{z}/{x}/{y}.pbf?gv=${geometryVersion}`
                : `/tiles/${tileset}/{z}/{x}/{y}.pbf?rev=${encodeURIComponent(revisionId)}`;

            const vectorGrid = (L as any).vectorGrid.protobuf(tileUrl, {
                // rendererFactory: (L as any).canvas.tile,
                pane: paneName,
                minZoom: 10,
                maxNativeZoom: 19,
                maxZoom: 25,
                vectorTileLayerStyles: {
                    [tileset]: (properties: Record<string, any>, zoom: number): any => {
                        return styleFunction(properties, zoom) ?? [];
                    },
                },
                interactive: false,
                getFeatureId: (feature: any) => feature.properties?.geometry_id,
            });

            console.log('vectorGrid adding to map, tile URL:', tileUrl);
            vectorGrid.addTo(map);
            layerRef.current = vectorGrid;
        });

        return () => {
            cancelled = true;
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, isGeometryOnly
        ? [map, tileset, geometryVersion]
        : [map, tileset, revisionId, selectedBuildingId, baseTileset]
    );

    return null;
};

export { BuildingVectorDataLayer };