import {describe, expect, it, vi} from 'vitest';
import {SnapshotHandler} from '../../src/handlers/SnapshotHandler';
import {Encoder} from '../../src/handlers/WebsocketHandler';

const encode = (item: any) => Encoder.encode(item);

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

describe('SnapshotHandler recording budgets', () => {
    function makeHandler(recordingBudgets: {context?: number, instance?: number}) {
        const logger = {warn: vi.fn()};
        const handler = new SnapshotHandler({
            websocketHandler: {broadcast: vi.fn()},
            logger,
            recordingBudgets,
        } as any);

        return {handler, logger};
    }

    let contexts = 0;
    const makeContext = (destroying = false) => {
        const id = `context-${contexts++}`;
        return {id, destroying, serialize: () => ({id})} as any;
    };
    const packet = (size: number, type = 'command') => ({id: crypto.randomUUID(), type, payload: 'x'.repeat(size)});
    const encodedSize = (packets: any[]) => packets.reduce((bytes, item) => bytes + encode(item).byteLength, 0);
    const warnings = (handler: SnapshotHandler, context) =>
        handler.getAllCachedItemsFrom(context).filter((item: any) => item.truncation !== undefined) as any[];

    it('reports the encoded size of a recording', () => {
        const {handler} = makeHandler({});
        const context = makeContext();

        handler.pushToCache(context, packet(100));
        handler.pushToCache(context, packet(200));

        const packets = handler.getAllCachedItemsFrom(context);
        expect(handler.statsOf(context)).toEqual({bytes: encodedSize(packets), packets: 2, truncated: false});
        expect(handler.stats().bytes).toBe(encodedSize(packets));
    });

    it('stops at the context budget, warns once and stays within it', () => {
        const {handler, logger} = makeHandler({context: 2000});
        const context = makeContext();

        for (let i = 0; i < 20; i++) {
            handler.pushToCache(context, packet(300));
        }

        expect(handler.statsOf(context).truncated).toBe(true);
        expect(warnings(handler, context)).toHaveLength(1);
        expect(warnings(handler, context)[0]).toMatchObject({
            type: 'log',
            messageType: 'warning',
            truncation: {budget: 'context', limit: 2000},
        });
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(handler.statsOf(context).bytes).toBeLessThanOrEqual(2000);
    });

    it('does not record later packets, even small ones', () => {
        const {handler} = makeHandler({context: 1000});
        const context = makeContext();
        handler.pushToCache(context, packet(5000));
        const {packets} = handler.statsOf(context);

        handler.pushToCache(context, packet(1));

        expect(handler.statsOf(context).packets).toBe(packets);
    });

    it('keeps the final test status of a truncated recording', () => {
        const {handler} = makeHandler({context: 1000});
        const context = makeContext();
        handler.pushToCache(context, packet(5000));

        handler.pushToCache(context, {type: 'test', specific: 'status', status: 'failed'});

        expect(handler.getAllCachedItemsFrom(context).at(-1)).toMatchObject({type: 'test', status: 'failed'});
    });

    it('keeps retained content references valid', () => {
        const {handler} = makeHandler({context: 1500});
        const context = makeContext();
        const body = () => new Uint8Array(400).fill(7);

        handler.pushToCache(context, response('first', body()));
        handler.pushToCache(context, response('duplicate', body()));
        handler.pushToCache(context, response('dropped', new Uint8Array(5000).fill(9)));
        handler.pushToCache(context, response('late-duplicate', new Uint8Array(5000).fill(9)));

        const retained: any[] = handler.getAllCachedItemsFrom(context);
        const ids = retained.map(item => item.id);
        expect(ids).not.toContain('dropped');
        expect(ids).not.toContain('late-duplicate');
        retained.filter(item => item.contentReference).forEach(item => expect(ids).toContain(item.contentReference));
        expect(retained.find(item => item.id === 'first').content).toEqual(body());
    });

    it('leaves other contexts recording when one reaches its budget', () => {
        const {handler} = makeHandler({context: 1000});
        const full = makeContext();
        const other = makeContext();

        handler.pushToCache(full, packet(5000));
        handler.pushToCache(other, packet(100));

        expect(handler.statsOf(full).truncated).toBe(true);
        expect(handler.statsOf(other)).toMatchObject({packets: 1, truncated: false});
    });

    it('makes room by evicting finished recordings first', () => {
        const {handler} = makeHandler({instance: 2000});
        const finished = makeContext(true);
        const active = makeContext();
        handler.pushToCache(finished, packet(1200));

        handler.pushToCache(active, packet(1200));

        expect(handler.statsOf(active)).toMatchObject({packets: 1, truncated: false});
        expect(handler.getAllCachedItemsFrom(finished)).toEqual([]);
        expect(handler.stats().bytes).toBeLessThanOrEqual(2000);
    });

    it('truncates the affected context when only active recordings use the instance budget', () => {
        const {handler} = makeHandler({instance: 2000});
        const first = makeContext();
        const second = makeContext();
        handler.pushToCache(first, packet(1200));

        handler.pushToCache(second, packet(1200));

        expect(handler.statsOf(first)).toMatchObject({packets: 1, truncated: false});
        expect(handler.statsOf(second).truncated).toBe(true);
        expect(warnings(handler, second)[0].truncation.budget).toBe('instance');
        expect(handler.stats().bytes).toBeLessThanOrEqual(2000);
    });

    it('sends packets to viewers using the bytes it measured', () => {
        const websocketHandler = {broadcast: vi.fn()};
        const handler = new SnapshotHandler({websocketHandler} as any);
        const item = packet(10);

        handler.pushToCache(makeContext(), item);

        expect(websocketHandler.broadcast).toHaveBeenCalledWith(item, expect.any(Uint8Array));
    });
});
