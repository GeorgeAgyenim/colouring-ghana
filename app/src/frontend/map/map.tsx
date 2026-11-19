import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttributionControl, MapContainer, ZoomControl, useMapEvent, Pane, useMap } from 'react-leaflet';
import { GeolocationControl } from './geolocation-control'

import 'leaflet/dist/leaflet.css';
import './map.css';

import { apiGet } from '../apiHelpers';
import { initialMapViewport, mapBackgroundColor, MapTheme, LayerEnablementState } from '../config/map-config';

import { Building } from '../models/building';

import { CityBaseMapLayer } from './layers/city-base-map-layer';
import { CityBoundaryLayer } from './layers/city-boundary-layer';
import { HistoricDataLayer } from './layers/historic-data-layer';
import { HistoricMapLayer } from './layers/historic-map-layer';
import { RegionBoundaryLayer, DistrictBoundaryLayer } from './layers/admin-boundary-layer';
import { BuildingBaseLayer } from './layers/building-base-layer';
import { BuildingDataLayer } from './layers/building-data-layer';
import { BuildingNumbersLayer } from './layers/building-numbers-layer';
import { BuildingHighlightLayer } from './layers/building-highlight-layer';

import { Legend } from './legend';
import SearchBox, { SearchResult } from './search-box';
import { SearchResultsLayer } from './search-results-layer';
import ThemeSwitcher from './theme-switcher';
import DataLayerSwitcher, { LAYER_OPTIONS_LIST_ID } from './data-switcher';
import { RegionSwitcher, DistrictSwitcher } from './boundary-switcher';
import { HistoricDataSwitcher } from './historic-data-switcher';
import { HistoricMapSwitcher } from './historic-map-switcher';
import { EditableBuildingsSwitcher } from './editable-buildings-switcher';
import { BuildingMapTileset } from '../config/tileserver-config';
import { useDisplayPreferences } from '../displayPreferences-context';
import { CategoryMapDefinition } from '../config/category-maps-config';

interface ColouringMapProps {
    selectedBuildingId?: number;
    mode: 'basic' | 'view' | 'edit' | 'multi-edit';
    revisionId: string;
    onBuildingAction: (building: Building) => void;
    /** Called as soon as the map is clicked, before the building under the click has been looked up. */
    onBuildingLookupStarted?: () => void;
    /** Called when the building under a click could not be looked up (for example, no connection). */
    onBuildingLookupFailed?: () => void;
    mapColourScale: BuildingMapTileset;
    onMapColourScale: (x: BuildingMapTileset) => void;
    categoryMapDefinitions: CategoryMapDefinition[]
}

export const ColouringMap : FC<ColouringMapProps> = ({
    mode,
    revisionId,
    onBuildingAction,
    onBuildingLookupStarted,
    onBuildingLookupFailed,
    selectedBuildingId,
    mapColourScale,
    onMapColourScale,
    categoryMapDefinitions,
    children
}) => {
    const { darkLightTheme, darkLightThemeSwitch, showLayerSelection } = useDisplayPreferences();
    const [position, setPosition] = useState(initialMapViewport.position);
    const [zoom, setZoom] = useState(initialMapViewport.zoom);

    // Search state: all current matches (drawn as pins) and the one hovered in the list.
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [hoveredSearchResultId, setHoveredSearchResultId] = useState<number | null>(null);

    const handleSearchResults = useCallback(
        (results: SearchResult[]) => setSearchResults(results),
        []
    );

    const handleSearchResultHover = useCallback(
        (id: number | null) => setHoveredSearchResultId(id),
        []
    );

    const handleSearchResultSelect = useCallback(
        (result: SearchResult) => {
            const [lng, lat] = result.geometry.coordinates;
            setPosition([lat, lng]);
            setZoom(result.attributes.zoom);
            // Clear pins once the user has picked one.
            setSearchResults([]);
            setHoveredSearchResultId(null);
        },
        []
    );

    // Each click takes the next number. Only the latest click's lookup counts: an earlier click whose
    // answer arrives later must not select (or paste onto) a building the person has moved on from.
    const latestClick = useRef(0);

    const handleClick = useCallback(
        async (e) => {
            const {lat, lng} = e.latlng;
            const click = ++latestClick.current;
            onBuildingLookupStarted?.();

            let data;
            try {
                data = await apiGet(`/api/buildings/locate?lat=${lat}&lng=${lng}`);
            } catch(error) {
                data = undefined;
            }
            if(click !== latestClick.current) {
                return;
            }
            // no answer, or the server's { error } answer: the building is not known
            if(data == undefined || data.error != undefined) {
                onBuildingLookupFailed?.();
                return;
            }
            const building = data[0];
            onBuildingAction(building);
        },
        [onBuildingAction, onBuildingLookupStarted, onBuildingLookupFailed],
    )

    return (
        <div className="map-container">
            <MapContainer
                center={initialMapViewport.position}
                zoom={initialMapViewport.zoom}
                minZoom={7}
                maxZoom={19}
                doubleClickZoom={false}
                zoomControl={false}
                attributionControl={false}
            >
                <ClickHandler onClick={handleClick} />
                <MapBackgroundColor theme={darkLightTheme} />
                <MapViewport position={position} zoom={zoom} />

                <Pane
                    key={darkLightTheme}
                    name={'cc-base-pane'}
                    style={{zIndex: 50}}
                >
                    <CityBaseMapLayer theme={darkLightTheme} />
                    <BuildingBaseLayer theme={darkLightTheme} />
                </Pane>

                {
                    mapColourScale &&
                        <BuildingDataLayer
                            tileset={mapColourScale}
                            revisionId={revisionId}
                        />
                }

                <Pane
                    name='cc-overlay-pane'
                    style={{zIndex: 300}}
                >
                    <CityBoundaryLayer/>
                    <HistoricDataLayer revisionId={revisionId} />
                    <HistoricMapLayer revisionId={revisionId} />
                    <RegionBoundaryLayer/>
                    <DistrictBoundaryLayer/>
                    <BuildingNumbersLayer revisionId={revisionId} />
                    {
                        selectedBuildingId &&
                            <BuildingHighlightLayer
                                selectedBuildingId={selectedBuildingId}
                                baseTileset={mapColourScale} 
                            />
                    }
                </Pane>
                <Pane
                    name='cc-label-overlay-pane'
                    style={{zIndex: 1000}}
                >
                </Pane>

                <ZoomControl position="topright" />
                <GeolocationControl />
                <SearchResultsLayer
                    results={searchResults}
                    hoveredId={hoveredSearchResultId}
                    onSelect={handleSearchResultSelect}
                />
                <AttributionControl prefix=""/>
            </MapContainer>
            {
                mode !== 'basic' &&
                <>
                    <Legend mapColourScaleDefinitions={categoryMapDefinitions} mapColourScale={mapColourScale} onMapColourScale={onMapColourScale}/>
                </>
            }
            {/*
                Below 990px wide only the options button shows until it is pressed, and the theme switch moves
                into the list; from 990px the theme switch sits above the options button, as before. Both theme
                switches are rendered and the stylesheet shows one (map-button.css), so the page is the same on
                the server and in the browser, and at each width the keyboard order matches what is seen.
                Ticket: docs/tickets/location-search/issues/19-layer-buttons-on-phones.md
            */}
            <div className="switchers-of-layers-map-menu">
                <ThemeSwitcher onSubmit={darkLightThemeSwitch} currentTheme={darkLightTheme} className="wide-screen-only" />
                <DataLayerSwitcher />
                <div id={LAYER_OPTIONS_LIST_ID} className="map-layer-options">
                    {
                        showLayerSelection === 'enabled' &&
                            <>
                                <ThemeSwitcher onSubmit={darkLightThemeSwitch} currentTheme={darkLightTheme} className="narrow-screen-only" />
                                <RegionSwitcher/>
                                <DistrictSwitcher/>
                                { /* <HistoricMapSwitcher/> */ }
                                { /* <HistoricDataSwitcher/> */ }
                                <EditableBuildingsSwitcher />
                            </>
                    }
                </div>
            </div>
            <SearchBox
                onResults={handleSearchResults}
                onResultHover={handleSearchResultHover}
                onResultSelect={handleSearchResultSelect}
            />
        </div>
    );
}

function ClickHandler({ onClick }: {onClick: (e) => void}) {
    useMapEvent('click', (e) => onClick(e));
    
    return null;
}

function MapBackgroundColor({ theme}: {theme: MapTheme}) {
    const map = useMap();
    useEffect(() => {
        map.getContainer().style.backgroundColor = mapBackgroundColor[theme];
    });

    return null;
}

function MapViewport({
    position,
    zoom
}: {
    position: [number, number];
    zoom: number;
}) {
    const map = useMap();

    useEffect(() => {
        map.setView(position, zoom)
    }, [position, zoom]);

    return null;
}
