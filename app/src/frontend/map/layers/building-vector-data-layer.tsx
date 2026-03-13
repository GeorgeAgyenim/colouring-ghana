import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { BuildingMapTileset } from '../../config/tileserver-config';
import { VECTOR_TILE_STYLES, VectorTileFeatureStyle } from './vector-tile-styles';

interface BuildingVectorDataLayerProps {
    tileset:    BuildingMapTileset;
    revisionId: string;
}

const VECTOR_PANE_Z_INDEX = 200;
const VECTOR_PANE_NAME = 'cc-vector-data-pane';

const BuildingVectorDataLayer: React.FC<BuildingVectorDataLayerProps> = ({
    tileset,
    revisionId,
}) => {
    const map = useMap();
    const layerRef = useRef<L.Layer | null>(null);

    useEffect(() => {
        let cancelled = false;

        import('leaflet.vectorgrid').then(() => {
            if (cancelled) return;

            if (!map.getPane(VECTOR_PANE_NAME)) {
                const pane = map.createPane(VECTOR_PANE_NAME);
                pane.style.zIndex = String(VECTOR_PANE_Z_INDEX);
                pane.style.pointerEvents = 'none';
            }

            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }

            const styleFunction = VECTOR_TILE_STYLES[tileset];
            if (!styleFunction) {
                console.warn(`[BuildingVectorDataLayer] No style defined for tileset: ${tileset}`);
                return;
            }

            const tileUrl = `/tiles/${tileset}/{z}/{x}/{y}.pbf?rev=${encodeURIComponent(revisionId)}`;

            const vectorGrid = (L as any).vectorGrid.protobuf(tileUrl, {
                // rendererFactory: (L as any).canvas.tile,
                pane: VECTOR_PANE_NAME,
                minZoom: 14,
                maxNativeZoom: 22,  // stop fetching new tiles here...
                maxZoom: 22,        // ...but keep rendering up to here
                vectorTileLayerStyles: {
                    [tileset]: (properties: Record<string, any>, zoom: number): any => {
                        const style: VectorTileFeatureStyle | null = styleFunction(properties, zoom);
                        if (!style) return {};
                        return style;
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
    }, [map, tileset, revisionId]);

    return null;
};

export { BuildingVectorDataLayer };