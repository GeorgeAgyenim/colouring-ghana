import React from 'react';

import './map-button.css';

interface ThemeSwitcherProps {
    currentTheme: string;
    /** Extra classes on the form, such as the screen widths it shows at (see map.tsx). */
    className?: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = (props) => (
    <form className={`map-button ${props.currentTheme} ${props.className ?? ''}`} onSubmit={props.onSubmit}>
        <button className="btn btn-outline btn-outline-dark"
            type="submit">
            {(props.currentTheme === 'light')? 'Switch to dark mode' : 'Switch to light mode'}

        </button>
    </form>
);

export default ThemeSwitcher;
