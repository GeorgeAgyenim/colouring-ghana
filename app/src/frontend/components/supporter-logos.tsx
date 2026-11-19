/**
 * Colouring Ghana's partners, shown on the log-in and sign-up pages: the same organisations the Ghana team
 * chose for the welcome page (pages/welcome.tsx).
 * Ticket: docs/tickets/location-search/issues/18-london-leftovers.md
 */
import React, { Fragment } from 'react';

import './supporter-logos.css';

const SupporterLogos = () => (
    <Fragment>
        <h2 className="h3">Lead Organisation and Project Partners</h2>
        <ul className="logo-list">
            <li>
                <a href="https://www.knust.edu.gh/">
                    <img src={`${process.env.SUBDIRECTORY??''}/images/knustlogo.png`}
                        alt="Kwame Nkrumah University of Science and Technology" />
                </a>
            </li>
            <li>
                <a href="https://colouringcities.org/">
                    <img src={`${process.env.SUBDIRECTORY??''}/images/logo-cc.jpg`}
                        alt="Colouring Cities Research Programme" />
                </a>
            </li>
            <li>
                <a href="https://www.lboro.ac.uk/">
                    <img src={`${process.env.SUBDIRECTORY??''}/images/logo-loughborough.png`}
                        alt="Loughborough University" />
                </a>
            </li>
        </ul>
    </Fragment>
);

export default SupporterLogos;
