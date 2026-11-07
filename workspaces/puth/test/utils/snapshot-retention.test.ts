import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeLocalPuthClient } from '../helper';
import { DEFAULT_SNAPSHOT_RETENTION, pruneSnapshots } from '../../src/utils/SnapshotRetention';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const unlimited = { maxFiles: 1000, maxBytes: 1024 * 1024, maxAgeDays: 1000 };

let directory: string;

beforeEach(() => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'puth-retention-'));
});

afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
});

function snapshot(name: string, ageInDays = 0, size = 10, parent = directory) {
    const file = path.join(parent, `snapshot-${name}.puth`);
    writeFileSync(file, Buffer.alloc(size));
    const time = new Date(now - ageInDays * DAY);
    utimesSync(file, time, time);

    return file;
}

const remaining = () => readdirSync(directory).sort();

describe('pruneSnapshots', () => {
    it('keeps everything within the limits', async () => {
        snapshot('a');
        snapshot('b', 1);

        assert.strictEqual(await pruneSnapshots(directory, unlimited, now), 0);
        assert.lengthOf(remaining(), 2);
    });

    it('removes the oldest files above the file limit', async () => {
        snapshot('new');
        snapshot('middle', 1);
        snapshot('old', 2);

        assert.strictEqual(await pruneSnapshots(directory, { ...unlimited, maxFiles: 2 }, now), 1);
        assert.deepEqual(remaining(), ['snapshot-middle.puth', 'snapshot-new.puth']);
    });

    it('removes the oldest files above the size limit', async () => {
        snapshot('new', 0, 60);
        snapshot('middle', 1, 30);
        snapshot('old', 2, 30);

        await pruneSnapshots(directory, { ...unlimited, maxBytes: 100 }, now);

        assert.deepEqual(remaining(), ['snapshot-middle.puth', 'snapshot-new.puth']);
    });

    it('removes files above the age limit', async () => {
        snapshot('new', 1);
        snapshot('old', 8);

        await pruneSnapshots(directory, { ...unlimited, maxAgeDays: 7 }, now);

        assert.deepEqual(remaining(), ['snapshot-new.puth']);
    });

    it('always keeps the newest file', async () => {
        snapshot('only', 30, 500);

        await pruneSnapshots(directory, { maxFiles: 0, maxBytes: 1, maxAgeDays: 1 }, now);

        assert.deepEqual(remaining(), ['snapshot-only.puth']);
    });

    it('leaves other files alone', async () => {
        writeFileSync(path.join(directory, '.gitignore'), '*');
        writeFileSync(path.join(directory, 'notes.puth'), 'mine');
        snapshot('new');
        snapshot('old', 30);

        await pruneSnapshots(directory, { ...unlimited, maxFiles: 1 }, now);

        assert.deepEqual(remaining(), ['.gitignore', 'notes.puth', 'snapshot-new.puth']);
    });
});

describe('Saving snapshots', () => {
    const cwd = process.cwd();
    const clients: any[] = [];

    afterEach(async () => {
        process.chdir(cwd);
        await Promise.all(clients.splice(0).map((client) => client.destroy()));
    });

    async function open(options = {}) {
        const client = makeLocalPuthClient(options);
        clients.push(client);

        let context!: any;
        client.getPuth().on('context:created', (event) => { context = event.context; });
        await client.contextCreate({ snapshot: true });

        return context;
    }

    function inDefaultDirectory() {
        const snapshots = path.join(directory, 'storage/snapshots');
        mkdirSync(snapshots, { recursive: true });
        process.chdir(directory);

        return snapshots;
    }

    it('cleans up the default location', async () => {
        const old = snapshot('old', 30, 10, inDefaultDirectory());
        const context = await open();

        await context.saveContextSnapshot({ to: 'file' });

        assert.isFalse(existsSync(old));
    });

    it('does not touch custom locations', async () => {
        const old = snapshot('old', 30);
        const context = await open();

        await context.saveContextSnapshot({ to: 'file', location: path.relative(cwd, directory) });

        assert.isTrue(existsSync(old));
    });

    it('can be turned off', async () => {
        const old = snapshot('old', 30, 10, inDefaultDirectory());
        const context = await open({ snapshotRetention: false });

        await context.saveContextSnapshot({ to: 'file' });

        assert.isTrue(existsSync(old));
    });

    it('uses configured limits on top of the defaults', async () => {
        const context = await open({ snapshotRetention: { maxFiles: 5 } });

        assert.deepEqual(context.puth.snapshotRetention, { ...DEFAULT_SNAPSHOT_RETENTION, maxFiles: 5 });
    });

    it.each([
        ['failed', (context) => context.testFailed(), 1],
        ['passed', () => {}, 0],
    ])('saves %s tests of a debug server accordingly', async (_, finish, saves) => {
        const context = await open({ debug: true });
        const save = vi.spyOn(context, 'saveContextSnapshot').mockResolvedValue(undefined);

        finish(context);
        await context.destroy({ immediately: true });

        expect(save).toHaveBeenCalledTimes(saves);
    });
});
