#!/usr/bin/env node
// Local, dependency-free fixture origins for browser tests.
//
// Two origins are served so tests can cover navigation, cookies, redirects and
// cross-origin behaviour without touching public websites:
//   primary - the playground page (fixtures/playground) plus helper routes
//   alt     - a minimal second origin (fixtures/alt)
//
// Configuration (environment):
//   PUTH_FIXTURE_URL      browser-reachable primary URL (default http://127.0.0.1:8081)
//   PUTH_FIXTURE_ALT_URL  browser-reachable alternate URL (default http://localhost:8082)
//   PUTH_FIXTURE_HOST     bind address (default 0.0.0.0)
// Ports are taken from the URLs above. The origins use different hostnames because
// cookies are not isolated by port.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PRIMARY_URL = 'http://127.0.0.1:8081';
export const DEFAULT_ALT_URL = 'http://localhost:8082';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
};

function createOrigin(root, urls, extraRoutes = {}) {
    const render = (text) => text.replaceAll('__PRIMARY_URL__', urls.primary).replaceAll('__ALT_URL__', urls.alt);

    return http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? '/', 'http://fixture.local');
            const route = extraRoutes[url.pathname];
            if (route) {
                return route(req, res, url);
            }

            let rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
            let file = path.join(root, rel);
            if (!file.startsWith(root)) {
                res.writeHead(403).end();
                return;
            }

            let body;
            try {
                const stat = await fs.stat(file);
                if (stat.isDirectory()) {
                    file = path.join(file, 'index.html');
                }
                body = await fs.readFile(file);
            } catch {
                // Unknown paths without a file extension fall back to the page, so
                // scenarios like /first/second?x=1#hash resolve deterministically.
                if (path.extname(rel)) {
                    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
                    return;
                }
                file = path.join(root, 'index.html');
                body = await fs.readFile(file);
            }

            const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
            if (type.startsWith('text/html')) {
                body = render(body.toString('utf8'));
            }
            res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body);
        } catch (error) {
            res.writeHead(500, { 'content-type': 'text/plain' }).end(String(error));
        }
    });
}

function helperRoutes(urls) {
    return {
        // /redirect?to=<url>&status=302
        '/redirect': (req, res, url) => {
            const to = url.searchParams.get('to') ?? '/';
            const status = Number(url.searchParams.get('status') ?? 302);
            res.writeHead(status, { location: to }).end();
        },
        // /cookies/set?name=a&value=b sets a cookie scoped to this origin
        '/cookies/set': (req, res, url) => {
            const name = url.searchParams.get('name') ?? 'fixture';
            const value = url.searchParams.get('value') ?? '1';
            res.writeHead(200, {
                'content-type': 'text/plain',
                'set-cookie': `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`,
            }).end('ok');
        },
        // /cookies/read echoes the cookie header (handy for assertions)
        '/cookies/read': (req, res) => {
            res.writeHead(200, { 'content-type': 'text/plain' }).end(req.headers.cookie ?? '');
        },
        // /reloading keeps destroying the execution context of whatever runs on it
        '/reloading': (req, res) => {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
                .end('<!doctype html><title>Reloading</title><script>setTimeout(() => location.reload(), 15)</script>');
        },
        // /slow?ms=300 answers late, so a page transition takes a while
        '/slow': (req, res, url) => {
            setTimeout(() => {
                res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
                    .end('<!doctype html><title>Slow page</title><h1 id="slow">Slow page</h1>');
            }, Number(url.searchParams.get('ms') ?? 300));
        },
        // /form?step=1&ms=0 is a form whose next step has the same field, answered after ms milliseconds
        '/form': (req, res, url) => {
            const step = Number(url.searchParams.get('step') ?? 1);
            const next = `/form?step=${step + 1}&ms=${Number(url.searchParams.get('ms') ?? 0)}`;
            setTimeout(() => {
                res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(
                    `<!doctype html><title>Step ${step}</title>`
                    + `<form method="post" action="${next}"><input id="name" name="name"><button id="submit">Submit</button></form>`
                    + `<a id="link" href="${next}">Next</a>`
                    + `<button id="assign" type="button" onclick="location.href = '${next}'">Assign</button>`
                    + `<button id="later" type="button" onclick="setTimeout(() => location.href = '${next}', 0)">Later</button>`,
                );
            }, step === 1 ? 0 : Number(url.searchParams.get('ms') ?? 0));
        },
        // /closable offers a button that closes the window, which only works in opened windows
        '/closable': (req, res) => {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
                .end('<!doctype html><title>Closable</title><button id="close" onclick="window.close()">Close</button>');
        },
        // /status/<code> is exercised through ?code=
        '/status': (req, res, url) => {
            res.writeHead(Number(url.searchParams.get('code') ?? 200), { 'content-type': 'text/plain' }).end('status');
        },
    };
}

const portOf = (url) => Number(new URL(url).port || (new URL(url).protocol === 'https:' ? 443 : 80));

/**
 * Start both fixture origins. Resolves with their URLs and a close() function.
 * Pass port 0 (via the URLs) to bind ephemeral ports; the returned URLs then
 * contain the actual ports.
 */
export async function startFixtures({
    primaryUrl = process.env.PUTH_FIXTURE_URL ?? DEFAULT_PRIMARY_URL,
    altUrl = process.env.PUTH_FIXTURE_ALT_URL ?? DEFAULT_ALT_URL,
    host = process.env.PUTH_FIXTURE_HOST ?? '0.0.0.0',
} = {}) {
    const urls = { primary: primaryUrl.replace(/\/$/, ''), alt: altUrl.replace(/\/$/, '') };
    const primary = createOrigin(path.join(here, 'playground'), urls, helperRoutes(urls));
    const alt = createOrigin(path.join(here, 'alt'), urls, helperRoutes(urls));

    const listen = (server, port) =>
        new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, host, () => resolve(server.address().port));
        });

    const primaryPort = await listen(primary, portOf(urls.primary));
    const altPort = await listen(alt, portOf(urls.alt));

    // With ephemeral ports the configured URLs are placeholders; rewrite them.
    const withPort = (url, port) => {
        const u = new URL(url);
        u.port = String(port);
        return u.origin;
    };
    urls.primary = withPort(urls.primary, primaryPort);
    urls.alt = withPort(urls.alt, altPort);

    return {
        primaryUrl: urls.primary,
        altUrl: urls.alt,
        close: () => Promise.all([primary, alt].map((s) => new Promise((r) => (s.closeAllConnections?.(), s.close(r))))),
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const fixtures = await startFixtures();
    console.log(`fixtures: primary ${fixtures.primaryUrl}, alt ${fixtures.altUrl}`);
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => fixtures.close().then(() => process.exit(0)));
    }
}
