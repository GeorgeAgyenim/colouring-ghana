/**
 * Client-side entry point to shared frontend React App
 *
 */
import React from 'react';
import { hydrate } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

import { App } from './frontend/app';

const data = (window as any).__PRELOADED_STATE__; // TODO: remove any

hydrate(
    <BrowserRouter basename={process.env.SUBDIRECTORY}>
        <App
            user={data.user}
            building={data.building}
            user_verified={data.user_verified}
            revisionId={data.latestRevisionId}
        />
    </BrowserRouter>,
    document.getElementById('root')
);
// TODO: This needs to be fixed. Since it is only for development, I am commenting it out as it is erroring on deployment
//if (module.hot) {
//    module.hot.accept();
//}
