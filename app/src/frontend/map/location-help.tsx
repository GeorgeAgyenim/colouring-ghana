/**
 * LocationHelp
 *
 * The pop-up behind "Learn more" on the message the map shows when the
 * person's location could not be found. The message itself is one plain line
 * (product owner, 20 November 2026, after Google Maps' "Your precise location
 * could not be determined" with "Learn more"); the steps live here.
 *
 * It lists every cause rather than the one the browser reported, because
 * browsers do not report causes reliably: Chrome on Android reports location
 * switched off for the whole phone as "took too long" (checked on a phone,
 * 20 November 2026).
 *
 * Drawn over the whole page (a portal into <body>), with Bootstrap's modal
 * classes. It takes focus on its Close button and keeps it there; Close,
 * Escape or a tap outside the box closes it.
 *
 * Ticket: docs/tickets/location-search/issues/26-location-off-reads-as-slow.md
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import './location-help.css';

const TITLE_ID = 'location-help-title';

interface LocationHelpProps {
    onClose: () => void;
}

const LocationHelp: React.FC<LocationHelpProps> = ({ onClose }) => {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeRef.current?.focus();
    }, []);

    // Listened for on the whole page, not the pop-up: in Safari a tap on the
    // pop-up's text can move focus to <body>, and keys would then miss it.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Tab') {
                // Close is the only thing to focus: keep focus in the pop-up.
                e.preventDefault();
                closeRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return ReactDOM.createPortal(
        // The outer box is the dimmed page around the pop-up: a tap on it closes the pop-up.
        <div
            className="modal location-help"
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            tabIndex={-1}
            onClick={onClose}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title h5" id={TITLE_ID}>Finding your location</h2>
                    </div>
                    <div className="modal-body">
                        <p>Try these, then tap the location button again:</p>
                        <ul>
                            <li>Allow this site to use your location, in your browser&apos;s site settings.</li>
                            <li>Turn on location in your device&apos;s settings.</li>
                            <li>Move outside or near a window.</li>
                            <li>Use a recent browser: Chrome, Safari, Firefox, Edge or Samsung Internet.</li>
                        </ul>
                    </div>
                    <div className="modal-footer">
                        <button
                            ref={closeRef}
                            type="button"
                            className="btn btn-outline-dark"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export { LocationHelp };
