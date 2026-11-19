import React from 'react';

import { CCConfig } from '../../cc-config';
let ccconfig: CCConfig = require('../../cc-config.json')

/*
 * Who runs the site, where to send enquiries and how to credit the maps are Colouring Ghana's,
 * not the London project's. Ticket: docs/tickets/location-search/issues/20-privacy-policy-and-contact-page.md
 */
const departmentWebsite = 'https://geomatics.knust.edu.gh/';
const departmentEmail = 'geomaticeng@knust.edu.gh';

const ContactPage = () => (
    <article>
        <section className="main-col">
            <h1 className="h2">
                Contact
            </h1>
            <p> Colouring Cities has been designed as a sustainable, low-cost model for knowledge exchange/open data platforms able to be reproduced by other towns and cities using our open platform code.</p>

            <p> Colouring {ccconfig.cityName} is run by the Department of Geomatic Engineering at {ccconfig.institution} (KNUST), Kumasi, Ghana, as part of the Colouring Cities Research Programme. We welcome constructive comments on how to improve the site, and on other types of data and new features you might like to see.</p>

            <p> You can send us comments or ask questions on our discussion threads at <a href={ccconfig.githubURL+"/discussions"}>{ccconfig.githubURL+"/discussions"}</a>.</p>

            <p> To view our technical site and platform code please visit Github at: <a href={ccconfig.githubURL}>{ccconfig.githubURL}</a>.</p>

            <p>For press and other enquiries please contact the Department of Geomatic Engineering by email at <a href={`mailto:${departmentEmail}`}>{departmentEmail}</a> or through its website at <a href={departmentWebsite}>{departmentWebsite}</a>.</p>

            <p>
            If you capture images from the maps on Colouring {ccconfig.cityName}, please credit our
            contributors (who collected the data) and <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>{' '}
            (who provided the basemap) as follows:
            </p>
            <p><code>
            Colouring Cities - Building attribute data is © Colouring Cities contributors. Basemap © OpenStreetMap contributors.
            </code></p>
            <hr />
            <p>
                <img className="d-block mx-auto" src={`${process.env.SUBDIRECTORY??''}/images/logo-cc.jpg`}></img>
            </p>
        </section>
    </article>
);

export default ContactPage;
