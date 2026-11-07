import { existsSync } from 'node:fs';
import { afterEach, assert, describe, expect, it, vi } from 'vitest';
import { LiveViewSnapshotPlugin } from '../src/plugins/LiveViewPlugin';
import { PuthStandardPlugin } from '../src/plugins/PuthStandardPlugin';
import { fixtureUrl, makeLocalPuthClient } from './helper';

const clients: any[] = [];

afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.destroy()));
});

function makeInstance({ liveView = false } = {}) {
    const client = makeLocalPuthClient();
    clients.push(client);
    client.use(PuthStandardPlugin);
    if (liveView) {
        client.use(LiveViewSnapshotPlugin);
    }

    const puth = client.getPuth();
    const contexts: any[] = [];
    const destroyed: string[] = [];
    puth.on('context:created', ({ context }) => contexts.push(context));
    puth.on('context:destroyed', ({ context }) => destroyed.push(context.id));

    return { client, puth, contexts, destroyed };
}

async function openPage(instance, options = {}) {
    const remote = await instance.client.contextCreate({ snapshot: true, ...options });
    const browser = await remote.createBrowser();
    const page = (await browser.pages())[0];
    await page.goto(fixtureUrl());

    return { remote, browser, page, context: instance.contexts.at(-1) };
}

const frames = (instance, session) =>
    instance.puth.snapshotHandler.getAllCachedItemsFrom(session.context).filter((item) => item.type === 'screencasts').length;

// The screencast only produces frames while the page visibly changes.
async function assertRecording(instance, session) {
    const before = frames(instance, session);
    let color = 0;

    await vi.waitFor(
        async () => {
            await session.page.evaluate(`(() => {
                const overlay = document.getElementById('frame-trigger')
                    ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'frame-trigger' }));
                overlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgb(${color++ % 255}, 40, 90)';
            })()`);
            expect(frames(instance, session)).toBeGreaterThan(before);
        },
        { timeout: 8000, interval: 100 },
    );
}

describe('Overlapping contexts', () => {
    it('keeps recording when another context closes', async () => {
        const instance = makeInstance({ liveView: true });
        const first = await openPage(instance);
        const second = await openPage(instance);
        await assertRecording(instance, first);
        await assertRecording(instance, second);

        await first.remote.destroy({ immediately: true });

        await assertRecording(instance, second);
    }, 30000);

    it('keeps recording when a context closes during a failed operation', async () => {
        const instance = makeInstance({ liveView: true });
        const failing = await openPage(instance);
        const other = await openPage(instance);

        const pending = failing.page.waitForSelector('#never-rendered', { timeout: 60000 }).catch((error) => error);
        await failing.remote.destroy({ immediately: true });

        await pending;
        await assertRecording(instance, other);
    }, 30000);

    it('does not record contexts with snapshots disabled', async () => {
        const instance = makeInstance({ liveView: true });
        const session = await openPage(instance, { snapshot: false });
        const recording = await openPage(instance);

        await assertRecording(instance, recording);
        await session.page.evaluate(`document.body.append('changed')`);
        await new Promise((resolve) => setTimeout(resolve, 300));

        assert.strictEqual(frames(instance, session), 0);
    }, 30000);

    it('does not capture a final screenshot with snapshots disabled', async () => {
        const instance = makeInstance();
        const remote = await instance.client.contextCreate({ snapshot: false });
        const browser = await remote.createBrowserShim();

        await browser.quit();

        const context = instance.contexts.at(-1);
        assert.lengthOf(instance.puth.snapshotHandler.getAllCachedItemsFrom(context), 0);
    }, 30000);

    it('still captures console messages with snapshots disabled', async () => {
        const instance = makeInstance();
        const session = await openPage(instance, { snapshot: false });

        await session.page.evaluate(`console.log('kept for clients')`);

        await vi.waitFor(() => {
            const logs = instance.puth.snapshotHandler.getAllCachedItemsFrom(session.context);
            assert.isTrue(logs.some((item) => item.type === 'log' && item.text === 'kept for clients'));
        });
    }, 30000);

    it('records a context created after another one closed', async () => {
        const instance = makeInstance({ liveView: true });
        const first = await openPage(instance);
        await first.remote.destroy({ immediately: true });

        await assertRecording(instance, await openPage(instance));
    }, 30000);
});

describe('Context destruction', () => {
    it('emits once and forgets the context after a delayed destroy', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);

        await instance.puth.contextDestroy({ id: session.context.id });

        await vi.waitFor(() => assert.deepEqual(instance.destroyed, [session.context.id]), { timeout: 3000 });
        assert.isFalse(await instance.puth.contextDestroy({ id: session.context.id }));
    });

    it('is safe to repeat while a destroy is running', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);

        const results = await Promise.all([
            session.context.destroy({ immediately: true }),
            session.context.destroy({ immediately: true }),
            session.context.destroy(),
        ]);

        assert.deepEqual(results, [true, true, true]);
        assert.deepEqual(instance.destroyed, [session.context.id]);
    });

    it('removes temporary files', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);
        const file = await session.context.saveTemporaryFile('upload.txt', Buffer.from('puth').toString('base64'));
        assert.isTrue(existsSync(file));

        await session.context.destroy({ immediately: true });

        assert.isFalse(existsSync(file));
    });

    it('still releases the browser when saving the snapshot fails', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);
        const [brc] = session.context.browsers;

        await session.context.destroy({ immediately: true, save: { to: 'file', location: 'missing/directory' } });

        assert.lengthOf(brc.ref.contexts, 0);
        assert.deepEqual(instance.destroyed, [session.context.id]);
    });
});

describe('Browser pool', () => {
    it('releases its reference when browser context creation fails', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);
        const [{ ref }] = session.context.browsers;
        vi.spyOn(ref.browser, 'createBrowserContext').mockRejectedValueOnce(new Error('creation failed'));

        const failed = await instance.client.contextCreate();
        await expect(failed.createBrowser()).rejects.toThrow();

        assert.lengthOf(ref.contexts, 1);
    });

    it('settles pending calls and removes the user data directory when the browser dies', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);
        const [{ ref }] = session.context.browsers;
        const userDataDir = ref.browser.process().spawnargs.find((arg) => arg.startsWith('--user-data-dir=')).split('=')[1];

        const pending = session.page.waitForSelector('#never-rendered', { timeout: 60000 }).catch((error) => error);
        ref.browser.process().kill('SIGKILL');

        await Promise.race([
            pending,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Call did not settle.')), 8000)),
        ]);
        await vi.waitFor(() => assert.isFalse(existsSync(userDataDir)), { timeout: 5000 });
        assert.lengthOf(ref.contexts, 0);
    }, 20000);

    it('closes pooled browsers with the instance', async () => {
        const instance = makeInstance();
        const session = await openPage(instance);
        const [{ ref }] = session.context.browsers;

        await instance.client.destroy();

        assert.isFalse(ref.browser.connected);
    });
});

describe('Puth events', () => {
    it('stops calling removed listeners', async () => {
        const instance = makeInstance();
        const listener = vi.fn();
        instance.puth.on('context:created', listener);
        instance.puth.off('context:created', listener);

        await instance.client.contextCreate();

        expect(listener).not.toHaveBeenCalled();
    });
});
