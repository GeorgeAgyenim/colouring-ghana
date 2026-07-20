import React from 'react';

import './map-button.css';
import { useDisplayPreferences } from '../displayPreferences-context';

export const DistrictSwitcher: React.FC<{}> = () => {
    const { district, districtSwitch, darkLightTheme } = useDisplayPreferences();
    return (
        <form className={`map-button ${district}-state ${darkLightTheme}`} onSubmit={districtSwitch}>
            <button className="btn btn-outline btn-outline-dark"
                type="submit">
                {(district === 'enabled')? 'Districts on' : 'Districts off'}
            </button>
        </form>
    );
}
