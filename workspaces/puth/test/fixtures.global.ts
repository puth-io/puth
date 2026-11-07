import type { TestProject } from 'vitest/node';
// @ts-ignore plain ESM helper shared with the other client suites
import { startFixtures } from '../../../dev/fixtures/server.mjs';

declare module 'vitest' {
    export interface ProvidedContext {
        fixtures: { primary: string; alt: string };
    }
}

export default async function ({ provide }: TestProject) {
    // A remote Puth may need fixtures that its own browser can reach.
    if (process.env.PUTH_FIXTURE_URL && process.env.PUTH_FIXTURE_ALT_URL) {
        provide('fixtures', { primary: process.env.PUTH_FIXTURE_URL, alt: process.env.PUTH_FIXTURE_ALT_URL });
        return;
    }

    const fixtures = await startFixtures({
        primaryUrl: 'http://127.0.0.1:0',
        altUrl: 'http://localhost:0',
        host: '127.0.0.1',
    });
    provide('fixtures', { primary: fixtures.primaryUrl, alt: fixtures.altUrl });

    return () => fixtures.close();
}
