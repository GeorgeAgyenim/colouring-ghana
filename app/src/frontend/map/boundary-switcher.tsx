import React from 'react';

import './map-button.css';
import { LayerEnablementState } from '../config/map-config';
import { useDisplayPreferences } from '../displayPreferences-context';

interface BoundarySwitcherProps {
    name: string;
    state: LayerEnablementState;
    onSwitch: (e: React.FormEvent<HTMLFormElement>) => void;
}

const BoundarySwitcher: React.FC<BoundarySwitcherProps> = ({ name, state, onSwitch }) => {
    const { darkLightTheme } = useDisplayPreferences();
    return (
        <form className={`map-button ${state}-state ${darkLightTheme}`} onSubmit={onSwitch}>
            <button className="btn btn-outline btn-outline-dark" type="submit">
                {(state === 'enabled') ? `${name} on` : `${name} off`}
            </button>
        </form>
    );
};

export const RegionSwitcher: React.FC = () => {
    const { region, regionSwitch } = useDisplayPreferences();
    return <BoundarySwitcher name="Regions" state={region} onSwitch={regionSwitch} />;
};

export const DistrictSwitcher: React.FC = () => {
    const { district, districtSwitch } = useDisplayPreferences();
    return <BoundarySwitcher name="Districts" state={district} onSwitch={districtSwitch} />;
};
