import bodyParser from 'body-parser';
import express from 'express';

import autofillController from './controllers/autofillController';
import * as editHistoryController from './controllers/editHistoryController';
import { ApiParamError, ApiUserError } from './errors/api'; 
import { DatabaseError, FieldTypeError, InvalidFieldError } from './errors/general';
import { logErrorSafely } from './logError';
import buildingsRouter from './routes/buildingsRouter';
import extractsRouter from './routes/extractsRouter';
import leaderboardRouter from './routes/leaderboardRouter';
import usersRouter from './routes/usersRouter';
import { queryLocation } from './services/search';
import { authUser, getNewUserAPIKey, logout } from './services/user';

const server = express.Router();

// parse POSTed json body
server.use(bodyParser.json());

server.use('/buildings', buildingsRouter);
server.use('/users', usersRouter);
server.use('/extracts', extractsRouter);
server.use('/leaderboard', leaderboardRouter);

server.get('/history', editHistoryController.getGlobalEditHistory);
server.get('/autofill', autofillController.getAutofillOptions);

// POST user auth
server.post('/login', function (req, res) {
    authUser(req.body.username, req.body.password).then(function (user: any) { // TODO: remove any
        if (user.user_id) {
            req.session.user_id = user.user_id;
        } else {
            req.session.user_id = undefined;
        }
        res.send(user);
    }).catch(function (error) {
        logErrorSafely('Error logging in:', error);
        res.status(500).send({ error: 'Database error' });
    });
});

// POST user logout
server.post('/logout', function (req, res) {
    logout(req.session).then(() => {
        res.send({ success: true });
    }).catch(err => {
        logErrorSafely('Failed to end session:', err);
        res.send({ error: 'Failed to end session'});
    });
});

// POST generate API key
server.post('/api/key', function (req, res) {
    if (!req.session.user_id) {
        res.send({ error: 'Must be logged in' });
        return;
    }

    getNewUserAPIKey(req.session.user_id).then(function (apiKey) {
        res.send(apiKey);
    }).catch(function (error) {
        logErrorSafely('Error sending new API key:', error);
        res.status(500).send({ error: 'Server error' });
    });
});

// GET search
server.get('/search', function (req, res) {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        res.send({
            error: 'Please provide a search term'
        });
        return;
    }
    queryLocation(searchTerm).then((results) => {
        if (typeof (results) === 'undefined') {
            res.send({
                error: 'Database error'
            });
            return;
        }
        res.send({
            results: results.map(item => {
                // map from DB results to GeoJSON Feature objects
                const geom = JSON.parse(item.st_asgeojson);
                return {
                    type: 'Feature',
                    id: item.search_id,
                    attributes: {
                        label: item.search_str,
                        search_class: item.search_class,
                        zoom: item.zoom || 9
                    },
                    geometry: geom
                };
            })
        });
    }).catch(function (error) {
        logErrorSafely('Error answering location search:', error);
        res.status(500).send({ error: 'Server error' });
    });
});

server.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
        // the answer has started and cannot be replaced, so the connection is closed.
        // Express's own handler would do the same, but it also prints the error's message
        logErrorSafely('Global error handler, after the answer started:', err);
        req.socket?.destroy();
        return;
    }

    if (err != undefined) {
        if (err instanceof ApiUserError) {
            let errorMessage: string;
            
            if(err instanceof ApiParamError) {
                errorMessage = `Problem with parameter ${err.paramName}: ${err.message}`;
            } else {
                errorMessage = err.message;
            }
            
            // a refusal about one field also names it, so the browser can show which field to fix
            // (docs/tickets/location-search/issues/08-refused-edit-names-the-field.md)
            const original = err.originalError;
            if(original instanceof InvalidFieldError || original instanceof FieldTypeError) {
                return res.status(400).send({ error: errorMessage, field: original.fieldName });
            }

            return res.status(400).send({ error: errorMessage });
        }
        
        // body-parser could not read the request body as JSON.
        // Its error carries the whole body, so it is answered and not logged
        if(err.type === 'entity.parse.failed') {
            return res.status(400).send({ error: 'Request body is not valid JSON' });
        }

        // we need to log the error only if it's not an api user error
        logErrorSafely('Global error handler:', err);
        
        if(err instanceof DatabaseError){
            res.status(500).send({ error: 'Database error' });
        } else {
            res.status(500).send({ error: 'Server error' });
        }
        
    }
});

server.use((req, res) => {
    res.status(404).json({ error: 'Resource not found'});
});


export default server;
