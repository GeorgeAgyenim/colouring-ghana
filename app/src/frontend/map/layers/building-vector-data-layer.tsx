import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { BuildingMapTileset } from '../../config/tileserver-config';
import { VECTOR_TILE_STYLES, VectorTileFeatureStyle, makeHighlightStyle } from './vector-tile-styles';

interface BuildingVectorDataLayerProps {
    tileset:    BuildingMapTileset | 'highlight';
    revisionId: string;
    selectedBuildingId?: number;
    baseTileset?: string;
}

const VECTOR_PANE_Z_INDEX = 200;
const VECTOR_PANE_NAME = 'cc-vector-data-pane';

const HIGHLIGHT_PANE_Z_INDEX = 301;
const HIGHLIGHT_PANE_NAME = 'cc-vector-highlight-pane';

const BuildingVectorDataLayer: React.FC<BuildingVectorDataLayerProps> = ({
    tileset,
    revisionId,
    selectedBuildingId,
    baseTileset,
}) => {
    const map = useMap();
    const layerRef = useRef<L.Layer | null>(null);

    useEffect(() => {
        let cancelled = false;

        import('leaflet.vectorgrid').then(() => {
            if (cancelled) return;

            const isHighlight = tileset === 'highlight';
            const paneName = isHighlight ? HIGHLIGHT_PANE_NAME : VECTOR_PANE_NAME;
            const paneZ = isHighlight ? HIGHLIGHT_PANE_Z_INDEX : VECTOR_PANE_Z_INDEX;

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

            const tileUrl = `/tiles/${tileset}/{z}/{x}/{y}.pbf?rev=${encodeURIComponent(revisionId)}`;

            const vectorGrid = (L as any).vectorGrid.protobuf(tileUrl, {
                // rendererFactory: (L as any).canvas.tile,
                pane: paneName,
                minZoom: 14,
                maxNativeZoom: 22,  // stop fetching new tiles here...
                maxZoom: 22,        // ...but keep rendering up to here
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
    }, [map, tileset, revisionId, selectedBuildingId, baseTileset]);

    return null;
};

export { BuildingVectorDataLayer };