import React, { createContext, useCallback, useContext, useState } from 'react';

import { LayerEnablementState, MapTheme } from './config/map-config';

type FormSwitch = (e: React.FormEvent<HTMLFormElement>) => void;

interface DisplayPreferencesContextState {
    showOverlayList: FormSwitch;
    hideOverlayList: FormSwitch;

    region: LayerEnablementState;
    regionSwitch: FormSwitch;

    district: LayerEnablementState;
    districtSwitch: FormSwitch;

    historicData: LayerEnablementState;
    historicDataSwitch: FormSwitch;
    historicDataSwitchOnClick: React.MouseEventHandler<HTMLButtonElement>;

    historicMap: LayerEnablementState;
    historicMapSwitch: FormSwitch;
    historicMapSwitchOnClick: React.MouseEventHandler<HTMLButtonElement>;

    editableBuildings: LayerEnablementState;
    editableBuildingsSwitch: FormSwitch;
    editableBuildingsSwitchOnClick: React.MouseEventHandler<HTMLButtonElement>;

    darkLightTheme: MapTheme;
    darkLightThemeSwitch: FormSwitch;
    darkLightThemeSwitchOnClick: React.MouseEventHandler<HTMLButtonElement>;

    showLayerSelection: LayerEnablementState;
    showLayerSelectionSwitch: FormSwitch;
    showLayerSelectionSwitchOnClick: React.MouseEventHandler<HTMLButtonElement>;
}

const stub = (): never => {
    throw new Error('DisplayPreferencesProvider not set up');
};

export const DisplayPreferencesContext = createContext<DisplayPreferencesContextState>({
    showOverlayList: stub,
    hideOverlayList: stub,

    region: undefined,
    regionSwitch: stub,

    district: undefined,
    districtSwitch: stub,

    historicData: undefined,
    historicDataSwitch: stub,
    historicDataSwitchOnClick: undefined,

    historicMap: undefined,
    historicMapSwitch: stub,
    historicMapSwitchOnClick: undefined,

    editableBuildings: undefined,
    editableBuildingsSwitch: stub,
    editableBuildingsSwitchOnClick: undefined,

    darkLightTheme: undefined,
    darkLightThemeSwitch: stub,
    darkLightThemeSwitchOnClick: undefined,

    showLayerSelection: undefined,
    showLayerSelectionSwitch: stub,
    showLayerSelectionSwitchOnClick: undefined,
});

function flip(state: LayerEnablementState): LayerEnablementState {
    return state === 'enabled' ? 'disabled' : 'enabled';
}

export const DisplayPreferencesProvider: React.FC = ({children}) => {
    const [region, setRegion] = useState<LayerEnablementState>('disabled');
    const [district, setDistrict] = useState<LayerEnablementState>('disabled');
    const [historicData, setHistoricData] = useState<LayerEnablementState>('disabled');
    const [historicMap, setHistoricMap] = useState<LayerEnablementState>('disabled');
    const [editableBuildings, setEditableBuildings] = useState<LayerEnablementState>('enabled');
    const [darkLightTheme, setDarkLightTheme] = useState<MapTheme>('night');
    const [showLayerSelection, setShowLayerSelection] = useState<LayerEnablementState>('disabled');

    const showOverlayList = useCallback(
        () => {
            setShowLayerSelection('enabled');
        },
        []
    );

    const hideOverlayList = useCallback(
        () => {
            setShowLayerSelection('disabled');
        },
        []
    );

    const regionSwitch = useCallback(
        (e) => {
            e.preventDefault();
            setRegion(flip(region));
        },
        [region],
    );

    const districtSwitch = useCallback(
        (e) => {
            e.preventDefault();
            setDistrict(flip(district));
        },
        [district],
    );

    // Historic data and historic map are mutually exclusive overlays.
    const flipHistoricData = (e) => {
        e.preventDefault();
        setHistoricData(flip(historicData));
    };
    const flipHistoricMap = (e) => {
        e.preventDefault();
        setHistoricMap(flip(historicMap));
    };

    const historicDataSwitch = useCallback(
        (e) => {
            if (historicMap === 'enabled') {
                flipHistoricMap(e);
            }
            flipHistoricData(e);
        },
        [historicData, historicMap],
    );
    const historicDataSwitchOnClick = flipHistoricData;

    const historicMapSwitch = useCallback(
        (e) => {
            if (historicData === 'enabled') {
                flipHistoricData(e);
            }
            flipHistoricMap(e);
        },
        [historicMap, historicData],
    );
    const historicMapSwitchOnClick = flipHistoricMap;

    const flipEditableBuildings = (e) => {
        e.preventDefault();
        setEditableBuildings(flip(editableBuildings));
    };
    const editableBuildingsSwitch = useCallback(flipEditableBuildings, [editableBuildings]);
    const editableBuildingsSwitchOnClick = flipEditableBuildings;

    const flipDarkLightTheme = (e) => {
        e.preventDefault();
        setDarkLightTheme(darkLightTheme === 'light' ? 'night' : 'light');
    };
    const darkLightThemeSwitch = useCallback(flipDarkLightTheme, [darkLightTheme]);
    const darkLightThemeSwitchOnClick = flipDarkLightTheme;

    const flipShowLayerSelection = (e) => {
        e.preventDefault();
        setShowLayerSelection(flip(showLayerSelection));
    };
    const showLayerSelectionSwitch = useCallback(flipShowLayerSelection, [showLayerSelection]);
    const showLayerSelectionSwitchOnClick = flipShowLayerSelection;

    return (
        <DisplayPreferencesContext.Provider value={{
            showOverlayList,
            hideOverlayList,

            region,
            regionSwitch,

            district,
            districtSwitch,

            historicData,
            historicDataSwitch,
            historicDataSwitchOnClick,

            historicMap,
            historicMapSwitch,
            historicMapSwitchOnClick,

            editableBuildings,
            editableBuildingsSwitch,
            editableBuildingsSwitchOnClick,

            darkLightTheme,
            darkLightThemeSwitch,
            darkLightThemeSwitchOnClick,

            showLayerSelection,
            showLayerSelectionSwitch,
            showLayerSelectionSwitchOnClick
        }}>
            {children}
        </DisplayPreferencesContext.Provider>
    );
};

export const useDisplayPreferences = (): DisplayPreferencesContextState => {
    return useContext(DisplayPreferencesContext);
};
