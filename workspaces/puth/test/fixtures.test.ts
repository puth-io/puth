import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, describe, expect, it } from 'vitest';
import { fixtureAltUrl, fixtureUrl, testLocal } from './helper';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
        const file = path.join(directory, name);
        if (['node_modules', 'vendor', 'target'].includes(name)) {
            return [];
        }
        if (statSync(file).isDirectory()) {
            return sourceFiles(file);
        }
        return /\.(html|java|php|ts)$/.test(name) ? [file] : [];
    });
}

describe('Fixture origins', () => {
    it('serves its page for unknown paths and 404s for unknown files', async () => {
        const page = await fetch(fixtureUrl('/first/second?param1=abc'));
        assert.strictEqual(page.status, 200);
        assert.include(await page.text(), '<title>Puth fixture</title>');

        assert.strictEqual((await fetch(fixtureUrl('/missing.css'))).status, 404);
    });

    it('links the primary origin to the alternate origin', async () => {
        const html = await (await fetch(fixtureUrl())).text();

        assert.include(html, `href="${fixtureAltUrl()}"`);
        assert.notInclude(html, '__ALT_URL__');
    });

    it('loads nothing besides the page', async () => {
        for (const url of [fixtureUrl(), fixtureAltUrl()]) {
            assert.notMatch(await (await fetch(url)).text(), /<(?:script|link|img|iframe)\b/i);
        }

        // Browsers ask for it anyway; a 404 would show up as a failed request in recordings.
        assert.strictEqual((await fetch(fixtureUrl('/favicon.ico'))).status, 204);
    });

    it('keeps routine suites off the public websites', () => {
        const offenders = [
            'dev/fixtures',
            'workspaces/puth/test',
            'workspaces/clients/php/client/tests',
            'workspaces/clients/php/workspaces/laravel/tests',
            'workspaces/clients/php/workspaces/laravel/config',
            'workspaces/clients/java/client/src/test',
        ]
            .flatMap((directory) => sourceFiles(path.join(root, directory)))
            .filter((file) => file !== fileURLToPath(import.meta.url))
            .filter((file) => /(?:https?:)?\/\/(?:[\w-]+\.)*puth\.(?:dev|io)\b/.test(
                // Comments may cite documentation, such as on.cypress.io references.
                readFileSync(file, 'utf8').replace(/^\s*(?:\/\/|\*).*$/gm, ''),
            ));

        expect(offenders).toEqual([]);
    });
});

describe('Fixture origins in a browser', () => {
    const bodyText = (page) => page.evaluate('document.body.innerText');

    testLocal('follows redirects across origins', async ({ puth: { page } }) => {
        await page.goto(fixtureUrl(`/redirect?to=${encodeURIComponent(fixtureAltUrl())}`));

        assert.strictEqual(await page.url(), fixtureAltUrl());
    });

    testLocal('isolates cookies between origins', async ({ puth: { page } }) => {
        await page.goto(fixtureUrl('/cookies/set?name=primary&value=1'));

        await page.goto(fixtureUrl('/cookies/read'));
        assert.include(await bodyText(page), 'primary=1');

        await page.goto(fixtureAltUrl('/cookies/read'));
        assert.notInclude(await bodyText(page), 'primary=1');
    });
});
