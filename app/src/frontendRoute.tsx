import express from 'express';
import _ from 'lodash';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import serialize from 'serialize-javascript';

import {
    getBuildingById,
    getBuildingUPRNsById,
    getBuildingPlanningDataById,
    getLatestRevisionId,
    getUserVerifiedAttributes
} from './api/services/building/base';
import { getUserById } from './api/services/user';
import { logErrorSafely } from './api/logError';
import { App } from './frontend/app';
import { parseBuildingURL } from './parse';
import asyncController from './api/routes/asyncController';

import { CCConfig } from './cc-config';
let config: CCConfig = require('./cc-config.json')

// What a shared link's preview shows, from the city settings and the welcome page's own words
// (src/frontend/pages/welcome.tsx). Escaped, as they are written into the page's HTML.
// docs/tickets/location-search/issues/18-london-leftovers.md
const siteName = _.escape(`Colouring ${config.cityName}`);
const siteUrl = _.escape(config.siteUrl);
const siteDescription = _.escape(
    `Colouring ${config.cityName} is a research-led, free public resource, providing open spatial data on ` +
    `${config.cityName}'s buildings and natural environment. It is managed by ${config.institution} and ` +
    'forms part of the Colouring Cities Research Programme.'
);

// reference packed assets
const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);


const frontendRoute = asyncController(async (req: express.Request, res: express.Response) => {
    const context: any = {}; // TODO: remove any
    const data: any = {}; // TODO: remove any
    context.status = 200;

    const userId = req.session.user_id;
    const buildingId = parseBuildingURL(req.url);
    const isBuilding = (typeof (buildingId) !== 'undefined');
    if (isBuilding && isNaN(buildingId)) {
        context.status = 404;
    }

    try {
        let [user, building, uprns, planningData, userVerified, latestRevisionId] = await Promise.all([
            userId ? getUserById(userId) : undefined,
            isBuilding ? getBuildingById(
                buildingId,
                { userDataOptions: userId ? { userId, userAttributes: true } : null }
            ) : undefined,
            isBuilding ? getBuildingUPRNsById(buildingId) : undefined,
            isBuilding ? getBuildingPlanningDataById(buildingId) : undefined,
            (isBuilding && userId) ? getUserVerifiedAttributes(buildingId, userId) : {},
            getLatestRevisionId()
        ]);

        if (isBuilding && typeof (building) === 'undefined') {
            context.status = 404;
        }
        data.user = user;
        data.building = building;
        data.user_verified = userVerified;
        if (data.building != null) {
            // the visitor's own answers sit beside the building's values, as the browser puts them when it reads
            // the building from the API (src/frontend/api-data/use-building-data.ts)
            // docs/tickets/location-search/issues/16-server-draws-the-default-category.md
            Object.assign(data.building, data.building.user_attributes);
            delete data.building.user_attributes;
        }
        if (data.building != null) {
            data.building.uprns = uprns;
        }
        if (data.building != null) {
            data.building.planning_data = planningData;
        }
        data.latestRevisionId = latestRevisionId;
        renderHTML(context, data, req, res);
    } catch(error) {
        logErrorSafely('Failed to load data for page:', error);
        data.user = undefined;
        data.building = undefined;
        data.user_verified = {}
        data.latestRevisionId = 0;
        context.status = 500;
        renderHTML(context, data, req, res);
    }
});

function renderHTML(context, data, req, res) {
    const markup = renderToString(
        <StaticRouter basename={process.env.SUBDIRECTORY} context={context} location={req.url}>
            <App
                user={data.user}
                building={data.building}
                revisionId={data.latestRevisionId}
                user_verified={data.user_verified}
            />
        </StaticRouter>
    );

    if (context.url) {
        res.redirect(context.url);
    } else {
        res.status(context.status).send(
            `<!doctype html>
    <html lang="">
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta charset="utf-8" />

        <meta property="og:url"                content="${siteUrl}" />
        <meta property="og:type"               content="website" />
        <meta property="og:title"              content="${siteName}" />
        <meta property="og:description"        content="${siteDescription}" />
        <meta property="og:locale"             content="en_GB" />
        <meta property="og:image"              content="${siteUrl}/images/logo-cc.jpg" />

        <link rel="manifest" href="${process.env.SUBDIRECTORY??''}/site.webmanifest">

        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black">
        <meta name="apple-mobile-web-app-title" content="${siteName}">
        <link rel="apple-touch-icon" href="${process.env.SUBDIRECTORY??''}/icon-192x192.png">

        <meta name="mobile-web-app-capable" content="yes">
        <link rel="icon" href="${process.env.SUBDIRECTORY??''}/favicon.ico">
        <link rel="icon" sizes="192x192" href="${process.env.SUBDIRECTORY??''}/icon-192x192.png">

        <title>${siteName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <style>
          @font-face {
            font-family: 'glacial_cl';
            src: url('${process.env.SUBDIRECTORY??''}/fonts/glacialindifference-regular-webfont.woff2') format('woff2'),
            url('${process.env.SUBDIRECTORY??''}/fonts/glacialindifference-regular-webfont.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
        </style>
        ${
            assets.client.css
                ? `<link rel="stylesheet" href="${assets.client.css}">`
                : ''
            }
        ${
            process.env.NODE_ENV === 'production'
                ? `<script src="${assets.client.js}" defer></script>`
                : `<script src="${assets.client.js}" defer crossorigin></script>`
            }
    </head>
    <body>
        <div id="root">${markup}</div>
        <script>
          window.__PRELOADED_STATE__ = ${serialize(data)}
        </script>
    </body>
</html>`
        );
    }
}

export default frontendRoute;
