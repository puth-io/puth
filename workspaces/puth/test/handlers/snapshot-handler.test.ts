import {describe, expect, it, vi} from 'vitest';
import {SnapshotHandler} from '../../src/handlers/SnapshotHandler';

function response(id: string, content: Uint8Array): any {
    return {id, type: 'response', content};
}

describe('SnapshotHandler response deduplication', () => {
    it('references the first response with an identical body in the same context', () => {
        const handler = new SnapshotHandler({websocketHandler: {broadcast: vi.fn()}} as any);
        const context = {} as any;
        const first = response('first', Uint8Array.from([1, 2, 3]));
        const duplicate = response('duplicate', Uint8Array.from([1, 2, 3]));

        handler.pushToCache(context, first, {broadcast: false});
        handler.pushToCache(context, duplicate, {broadcast: false});

        expect(first.content).toEqual(Uint8Array.from([1, 2, 3]));
        expect(first.contentHash).toHaveLength(64);
        expect(first.contentLength).toBe(3);
        expect(duplicate.content).toBeUndefined();
        expect(duplicate.contentHash).toBe(first.contentHash);
        expect(duplicate.contentLength).toBe(3);
        expect(duplicate.contentReference).toBe('first');
    });

    it('does not reference response bodies from another context', () => {
        const handler = new SnapshotHandler({websocketHandler: {broadcast: vi.fn()}} as any);
        const first = response('first', Uint8Array.from([1, 2, 3]));
        const second = response('second', Uint8Array.from([1, 2, 3]));

        handler.pushToCache({} as any, first, {broadcast: false});
        handler.pushToCache({} as any, second, {broadcast: false});

        expect(second.content).toEqual(Uint8Array.from([1, 2, 3]));
        expect(second.contentReference).toBeUndefined();
    });
});
