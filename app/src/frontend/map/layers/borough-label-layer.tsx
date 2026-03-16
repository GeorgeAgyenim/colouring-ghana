import React from 'react';
import { useDisplayPreferences } from '../../displayPreferences-context';

export function BoroughLabelLayer({}) {
    const { borough } = useDisplayPreferences();

    if(borough == "enabled") {
        return null;
    } else {
        return <></>
    }
}
