import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import puppeteer, { type Browser } from 'puppeteer-core';
import Context from '../../src/Context';
import { usableBrowserInstallations } from '../../src/utils/Platform';

describe('detour browser cache', () => {
    let browser: Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            executablePath: usableBrowserInstallations[0].executablePath,
            args: ['--no-sandbox'],
        });
    });
    afterAll(async () => { await browser?.close(); });

    it('isolates source URLs, portal paths, and contexts while retaining repeat-request caching', async () => {
        const requests: string[] = [];
        const server = createServer((request, response) => {
            requests.push(request.url!);
            response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' });
            response.end(request.headers['puth-portal-url'] ?? 'home');
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = `http://127.0.0.1:${(server.address() as any).port}/`;
        const puth = { http: { url: base }, logger: { debug() {} } } as any;
        let context = new Context(puth);
        let portalPath: string | undefined;
        const page = await browser.newPage();
        try {
            const cdp = await page.createCDPSession();
            // Exercise URL rewriting independently of the body-only detour policy.
            await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${base}original/*` }] });
            cdp.on('Fetch.requestPaused', async event => {
                await context.portalRequestDetourToCatcher(
                    event.requestId, event, portalPath ?? new URL(event.request.url).pathname, cdp,
                );
            });
            for (const path of ['original/a', 'original/b']) {
                const url = new URL(path, base).toString();
                const response = await page.goto(url);
                expect(await response!.text()).toBe(url);
            }
            const repeated = await page.goto(new URL('original/a', base).toString());
            expect(await repeated!.text()).toBe(new URL('original/a', base).toString());
            expect(requests.filter(path => path.startsWith('/portal/detour/'))).toHaveLength(2);

            portalPath = '/another-portal-path';
            await page.goto(new URL('original/a', base).toString());
            expect(requests.filter(path => path.startsWith('/portal/detour/'))).toHaveLength(3);

            // Share Chrome's cache to verify that routing contexts have distinct URLs.
            context = new Context(puth);
            await page.goto(new URL('original/a', base).toString());
            const detours = requests.filter(path => path.startsWith('/portal/detour/'));
            expect(detours).toHaveLength(4);
            expect(new Set(detours).size).toBe(4);
        } finally {
            await page.close();
            await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        }
    });
});
