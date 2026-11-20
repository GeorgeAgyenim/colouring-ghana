import React from 'react';

import './map-button.css';
import { LayersIcon } from '../components/icons';
import { useDisplayPreferences } from '../displayPreferences-context';

/** The id of the list of layer options this button opens and closes; map.tsx renders the list. */
export const LAYER_OPTIONS_LIST_ID = 'map-layer-options';

interface DataLayerSwitcherProps {
}

/**
 * Opens and closes the layer options. From 990px wide it reads "Show/Hide layer options", as before. On
 * narrower screens it is a small layers icon that fits beside the zoom and locate buttons, and a screen reader
 * calls it "Show/Hide map layers". The stylesheet shows one label or the other (map-button.css).
 * Ticket: docs/tickets/location-search/issues/19-layer-buttons-on-phones.md
 */
const DataLayerSwitcher: React.FC<DataLayerSwitcherProps> = (props) => {
    const { showLayerSelection, showOverlayList, hideOverlayList, darkLightTheme } = useDisplayPreferences();
    const isOpen = showLayerSelection === 'enabled';
    const handleSubmit = (evt) => {
        evt.preventDefault();
        if (isOpen) {
            hideOverlayList(evt)
        } else {
            showOverlayList(evt)
        }
    }
    return (
        <form className={`map-button layer-options-toggle ${darkLightTheme}`} onSubmit={handleSubmit}>
            <button className="btn btn-outline btn-outline-dark"
                type="submit"
                aria-expanded={isOpen}
                aria-controls={LAYER_OPTIONS_LIST_ID}>
                <span className="wide-screen-only">{isOpen ? 'Hide layer options' : 'Show layer options'}</span>
                <span className="narrow-screen-only">
                    <LayersIcon />
                    <span className="visually-hidden">{isOpen ? 'Hide map layers' : 'Show map layers'}</span>
                </span>
            </button>
        </form>
    );
}

export default DataLayerSwitcher;
