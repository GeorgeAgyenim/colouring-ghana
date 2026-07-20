import React from 'react';

import './map-button.css';
import { useDisplayPreferences } from '../displayPreferences-context';

export const RegionSwitcher: React.FC<{}> = () => {
    const { region, regionSwitch, darkLightTheme } = useDisplayPreferences();
    return (
        <form className={`map-button ${region}-state ${darkLightTheme}`} onSubmit={regionSwitch}>
            <button className="btn btn-outline btn-outline-dark"
                type="submit">
                {(region === 'enabled')? 'Regions on' : 'Regions off'}
            </button>
        </form>
    );
}
