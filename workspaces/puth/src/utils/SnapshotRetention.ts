import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

export type SnapshotRetention = {
    maxFiles: number;
    maxBytes: number;
    maxAgeDays: number;
};

export const DEFAULT_SNAPSHOT_RETENTION: SnapshotRetention = {
    maxFiles: 200,
    maxBytes: 1024 * 1024 * 1024,
    maxAgeDays: 14,
};

const SNAPSHOT_FILE = /^snapshot-.+\.puth$/;

/**
 * Removes the oldest snapshots that exceed a limit and returns how many. The newest one always stays, it is usually
 * the one that was just written. Other files in the directory are not touched.
 */
export async function pruneSnapshots(directory: string, limits: SnapshotRetention, now = Date.now()): Promise<number> {
    const names = (await readdir(directory)).filter(name => SNAPSHOT_FILE.test(name));

    const files = await Promise.all(names.map(async (name) => {
        const file = path.join(directory, name);
        const { size, mtimeMs } = await stat(file);

        return { file, size, mtimeMs };
    }));
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const oldestAllowed = now - limits.maxAgeDays * 24 * 60 * 60 * 1000;
    let bytes = 0;

    const expired = files.filter(({ size, mtimeMs }, index) => {
        bytes += size;

        return index > 0 && (index >= limits.maxFiles || bytes > limits.maxBytes || mtimeMs < oldestAllowed);
    });

    await Promise.all(expired.map(({ file }) => rm(file, { force: true })));

    return expired.length;
}
