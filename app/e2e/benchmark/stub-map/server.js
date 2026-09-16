/**
 * Stand-in for the map page, used only to self-check the benchmark harness without a
 * database: Leaflet from node_modules, a fake `/tiles/` server that answers every tile with
 * the same small PNG after a short delay and no cache headers (like Mapnik), a fake locate
 * endpoint, a sidebar with category links, and a second origin standing in for the basemap
 * (cross-origin, so the Performance API hides its byte counts as the OSM host does).
 *
 *   node e2e/benchmark/stub-map/server.js [appPort=3999] [basemapPort=3998]
 *
 * Implements nothing user-facing; a fixture for NFR-1.4 / NFR-1.5 tooling.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const appPort = Number(process.argv[2] || 3999);
const basemapPort = Number(process.argv[3] || 3998);
const leafletDir = path.dirname(require.resolve('leaflet/package.json'));
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const fakeTile = Buffer.concat([onePixelPng, Buffer.alloc(3000)]);
const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('__BASEMAP_PORT__', String(basemapPort));

function serveApp(request, response) {
    const url = new URL(request.url, `http://localhost:${appPort}`);
    if (url.pathname.startsWith('/tiles/')) {
        setTimeout(() => {
            response.writeHead(200, { 'Content-Type': 'image/png' });
            response.end(fakeTile);
        }, 20);
    } else if (url.pathname === '/api/buildings/locate') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify([{ building_id: 4242 }]));
    } else if (url.pathname === '/leaflet.js' || url.pathname === '/leaflet.css') {
        response.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css' });
        response.end(fs.readFileSync(path.join(leafletDir, 'dist', url.pathname.slice(1))));
    } else if (url.pathname.startsWith('/images/')) {
        response.writeHead(404);
        response.end();
    } else {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(page);
    }
}

function serveBasemap(request, response) {
    setTimeout(() => {
        response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600' });
        response.end(onePixelPng);
    }, 5);
}

http.createServer(serveApp).listen(appPort, () => console.log(`stub map page on http://localhost:${appPort}`));
http.createServer(serveBasemap).listen(basemapPort, () => console.log(`stub basemap on http://127.0.0.1:${basemapPort}`));
