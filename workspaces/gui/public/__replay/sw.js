// Serves the GUI's DOM replay. Replay documents load /__replay/frame.html, which this worker controls, and every
// request they make is answered here: recorded bodies by their original URL, everything else with 404. Nothing
// reaches the network, also without a running Puth.
//
// The GUI writes the bodies to Cache Storage and sends which URL serves which body (the map) before it builds a
// replay. Both survive this worker being stopped.

const CACHE = 'puth-replay-v1';
const FRAME = '/__replay/frame.html';
const MAP = '/__replay/map.json';
const BODY = '/__replay/body/';

// Everything it allows is still answered by this worker. Inline styles are safe because no script runs.
const REPLAY_CSP = "default-src * data: blob:; style-src * data: blob: 'unsafe-inline'; script-src 'none'; "
    + "object-src 'none'; frame-src 'self'; form-action 'none'; connect-src 'none'; worker-src 'none'; manifest-src 'none'";
const FRAME_HTML = '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta http-equiv="x-dns-prefetch-control" content="off"></head><body></body></html>';
// Statuses a Response with a body can't have.
const NO_BODY = [101, 103, 204, 205, 304];

let map = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
    if (event.data?.type !== 'map') {
        return;
    }
    map = event.data.map;
    event.waitUntil(caches.open(CACHE)
        .then((cache) => cache.put(MAP, new Response(JSON.stringify(map), {headers: {'content-type': 'application/json'}})))
        .then(() => event.ports[0]?.postMessage(true)));
});

const notRecorded = () => new Response('Not recorded', {status: 404, headers: {'content-type': 'text/plain'}});

async function recordedMap() {
    if (map === null) {
        const stored = await caches.open(CACHE).then((cache) => cache.match(MAP));
        map = stored ? await stored.json() : {};
    }
    return map;
}

async function recorded(request) {
    const url = new URL(request.url);
    url.hash = '';
    const entry = (await recordedMap())[url.href];
    if (entry === undefined) {
        return notRecorded();
    }

    const [hash, status, contentType] = entry;
    const body = await caches.open(CACHE).then((cache) => cache.match(BODY + hash));
    if (body === undefined) {
        return notRecorded();
    }
    return new Response(body.body, {
        status: status >= 200 && status <= 599 && ! NO_BODY.includes(status) ? status : 200,
        headers: {'content-type': contentType},
    });
}

async function sameOrigin(event) {
    // A replay document never reaches the GUI's server, for example through a relative URL that resolved wrongly.
    const client = event.clientId ? await self.clients.get(event.clientId) : undefined;
    if (client !== undefined && new URL(client.url).pathname === FRAME) {
        return notRecorded();
    }
    return fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin === self.location.origin && url.pathname === FRAME && event.request.mode === 'navigate') {
        event.respondWith(new Response(FRAME_HTML, {
            headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': REPLAY_CSP},
        }));
        return;
    }

    event.respondWith(url.origin === self.location.origin ? sameOrigin(event) : recorded(event.request));
});
