import { describe, expect, it, vi } from 'vitest';
import { ProtocolError } from 'puppeteer-core';
import Context from '../../src/Context';
import { Return } from '../../src/context/Return';
import { Browser } from '../../src/shims/Browser';
import { Call } from '../../src/utils/Call';
import { CallStack } from '../../src/utils/CallStack';

const logger = {
    debug: () => {},
    error: () => {},
    warn: () => {},
};

function makeStack(overrides: Record<string, unknown> = {}) {
    const page = {};
    const context = {
        caches: { dialog: new Map() },
        waitingForDialog: [],
        puth: { logger },
        psuriCache: new Map(),
        isDetourEnabled: false,
        portalTimeout: 120000,
        portalSafeUniqueRequestId: () => '1',
        setPsuriHandler(psuri, handler) {
            this.psuriCache.get(psuri).handler = handler;
        },
        ...overrides,
    };

    return {
        context,
        page,
        stack: new CallStack(context as any, page as any),
    };
}

function makeCall(functionName = 'click') {
    return new Call(
        { function: functionName },
        Promise.withResolvers<unknown>(),
        {},
    );
}

function makeEventTarget(properties: Record<string, unknown> = {}) {
    const listeners = new Map<string, Set<(...args: any[]) => void>>();

    return {
        ...properties,
        listeners,
        on: vi.fn((event: string, listener: (...args: any[]) => void) => {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(listener);
        }),
        off: vi.fn((event: string, listener: (...args: any[]) => void) => {
            listeners.get(event)?.delete(listener);
        }),
        emit(event: string, ...args: any[]) {
            for (const listener of [...(listeners.get(event) ?? [])]) listener(...args);
        },
    };
}

describe('CallStack', () => {
    it('returns an unknown error when a call rejects without a reason', async () => {
        const context = new Context({ logger, debug: false } as any);
        const call = new Call(
            { function: 'reject', parameters: [] },
            Promise.withResolvers<unknown>(),
            { reject: () => Promise.reject() },
        );

        await context.handleCallApply(call);

        await expect(call.response.promise).resolves.toMatchObject({
            type: 'error',
            code: 'MethodException',
            message: 'Function reject threw error: unknown error',
            error: expect.objectContaining({ message: 'unknown error' }),
        });
    });

    it('keeps a dialog result when the interrupted call finishes during a portal request', async () => {
        const { context, stack } = makeStack();
        const call = makeCall();
        const dialog = {
            message: () => 'Confirm?',
            defaultValue: () => '',
            type: () => 'confirm',
        };

        await call.resolve(Return.ServerRequest({ psuri: '1' }).serialize());
        stack.activeCall = call;
        stack.portal.queue.active.push({ psuri: '1' });

        await stack.onDialogOpen(dialog as any);

        expect(context.caches.dialog.get(stack['page'])).toBe(dialog);
        expect(stack.portal.waiting.response).toEqual(
            Return.Dialog({ message: 'Confirm?', defaultValue: '', type: 'confirm' }).serialize(),
        );

        stack.conclude(call, Return.Self().serialize());

        expect(stack.portal.waiting.response).toEqual(
            Return.Dialog({ message: 'Confirm?', defaultValue: '', type: 'confirm' }).serialize(),
        );
        expect(stack.skipCallResponses).not.toContain(call);
    });

    it('stores an iframe browser stack under its parent page', async () => {
        const parentPage = {};
        const frame = { page: () => parentPage };
        const browser = new Browser({} as any, frame as any);
        const context = new Context({ logger } as any);
        context.addToCache('GenericObject', 'browser', browser);
        const call = vi.spyOn(CallStack.prototype, 'call').mockResolvedValue(undefined);

        context.call(
            { type: 'GenericObject', id: 'browser', function: 'isPage', parameters: [] },
            Promise.withResolvers<unknown>(),
        );

        expect(context.callStacks.get(parentPage as any)).toBeInstanceOf(CallStack);
        expect(context.callStacks.has(frame as any)).toBe(false);
        expect(call).toHaveBeenCalledOnce();

        call.mockRestore();
    });

    it('encodes direct portal request bodies as UTF-8', async () => {
        const { stack } = makeStack();
        const handle = vi.spyOn(stack, 'handlePortalRequest').mockImplementation(() => {});
        const cdp = { send: vi.fn() };
        const postData = JSON.stringify({ message: 'Grüße 👋' });

        await stack.onPortalRequest({
            requestId: 'fetch-1',
            request: {
                url: 'https://example.test/action',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                hasPostData: true,
                postData,
            },
        } as any, '/action', cdp as any);

        expect(Buffer.from(handle.mock.calls[0][0].data, 'base64').toString('utf8')).toBe(postData);
    });

    it('retrieves omitted portal request bodies when detours are disabled', async () => {
        const { stack } = makeStack();
        const handle = vi.spyOn(stack, 'handlePortalRequest').mockImplementation(() => {});
        const cdp = {
            send: vi.fn().mockResolvedValue({ postData: 'large request body' }),
        };

        await stack.onPortalRequest({
            requestId: 'fetch-1',
            networkId: 'network-1',
            request: {
                url: 'https://example.test/action',
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                hasPostData: true,
            },
        } as any, '/action', cdp as any);

        expect(cdp.send).toHaveBeenCalledWith('Network.getRequestPostData', { requestId: 'network-1' });
        expect(Buffer.from(handle.mock.calls[0][0].data, 'base64').toString('utf8')).toBe('large request body');
    });

    it('rejects a portal response that does not match the active request', async () => {
        const { context, stack } = makeStack();
        const activeHandler = vi.fn();
        const otherHandler = vi.fn();
        const activeRequest = { psuri: '1' };
        stack.activeCall = makeCall();
        stack.portal.queue.active.push(activeRequest);
        context.psuriCache.set('1', { stack, handler: activeHandler });
        context.psuriCache.set('2', { stack, handler: otherHandler });

        await expect(stack.handlePortalResponse({
            psuri: '2',
            type: 'PortalResponse',
            headers: {},
            body: btoa('wrong response'),
            status: 200,
        }, { resolve: vi.fn() })).rejects.toThrow(/does not match/);

        expect(stack.portal.queue.active).toEqual([activeRequest]);
        expect(activeHandler).not.toHaveBeenCalled();
        expect(otherHandler).not.toHaveBeenCalled();
        expect(context.psuriCache.has('1')).toBe(true);
        expect(context.psuriCache.has('2')).toBe(true);
    });

    it('fails a paused request when portal interception throws', async () => {
        const error = vi.fn();
        const context = new Context({ logger: { ...logger, error } } as any, {
            supports: { portal: { urlPrefixes: ['https://example.test'] } },
        });
        const stack = {
            onPortalRequest: vi.fn().mockRejectedValue(new Error('interception failed')),
        };
        const cdp = { send: vi.fn().mockResolvedValue(undefined) };
        const event = {
            requestId: 'fetch-1',
            request: { url: 'https://example.test/action' },
        };

        await context['handleRequestPaused'](stack as any, event as any, cdp as any);

        expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
            requestId: 'fetch-1',
            errorReason: 'Failed',
        });
        expect(error).toHaveBeenCalled();
    });

    it('removes portal request cache entries when interception setup fails', async () => {
        const { context, stack } = makeStack();
        const cdp = { send: vi.fn().mockRejectedValue(new Error('body unavailable')) };

        await expect(stack.onPortalRequest({
            requestId: 'fetch-1',
            networkId: 'network-1',
            request: {
                url: 'https://example.test/action',
                method: 'POST',
                headers: {},
                hasPostData: true,
            },
        } as any, '/action', cdp as any)).rejects.toThrow('body unavailable');

        expect(context.psuriCache.has('1')).toBe(false);
    });

    it('releases page, CDP, dialog, waiter, and portal state when a page closes', async () => {
        const cdp = makeEventTarget({ send: vi.fn().mockResolvedValue({ frameTree: { frame: { id: 'main' } } }) });
        const page = makeEventTarget({
            emulateMediaFeatures: vi.fn().mockResolvedValue(undefined),
            createCDPSession: vi.fn().mockResolvedValue(cdp),
        });
        const context = new Context({ logger } as any, {
            supports: { portal: { urlPrefixes: ['https://example.test'] } },
        });
        const reject = vi.fn();

        await context['trackPage'](page as any);
        const stack = context.callStacks.get(page as any);
        context.caches.dialog.set(page as any, {} as any);
        context.waitingForDialog.push({ page: page as any, resolve: vi.fn(), reject });
        context.psuriCache.set('1', { stack });

        page.emit('close');

        expect(context.callStacks.has(page as any)).toBe(false);
        expect(context['pageCDPSessions'].has(page as any)).toBe(false);
        expect(context.caches.dialog.has(page as any)).toBe(false);
        expect(context.waitingForDialog).toHaveLength(0);
        expect(reject).toHaveBeenCalledOnce();
        expect(context.psuriCache.has('1')).toBe(false);
        expect(page.listeners.get('dialog')).toHaveLength(0);
        expect(cdp.listeners.get('Fetch.requestPaused')).toHaveLength(0);
    });

    it('continues the portal queue when Chrome already canceled the intercepted request', async () => {
        const { stack } = makeStack();
        const call = makeCall();
        const protocolError = new ProtocolError();
        protocolError.originalMessage = 'Invalid InterceptionId.';
        const cdp = { send: vi.fn().mockRejectedValue(protocolError) };
        const response = { resolve: vi.fn() };

        stack.activeCall = call;
        await stack.onPortalRequest({
            requestId: 'fetch-1',
            request: {
                url: 'https://example.test/app.css',
                method: 'GET',
                headers: {},
                hasPostData: false,
            },
        } as any, '/app.css', cdp as any);
        stack.portal.waiting.response = Return.Self().serialize();

        await stack.handlePortalResponse({
            psuri: '1',
            type: 'PortalResponse',
            headers: { 'Content-Type': 'text/css' },
            body: btoa('body {}'),
            status: 200,
        }, response);

        expect(stack.portal.queue.active).toHaveLength(0);
        expect(response.resolve).toHaveBeenCalledWith(Return.Self().serialize());
    });
});

describe('CallStack disposal', () => {
    it('settles the active call and ignores its late result', async () => {
        const { stack } = makeStack();
        const call = makeCall();
        call.setStack(stack);
        stack.activeCall = call;

        stack.dispose('Page closed while a call was pending.');

        await expect(call.response.promise).resolves.toMatchObject({
            type: 'error',
            code: 'PageUnavailable',
            message: 'Page closed while a call was pending.',
        });
        await expect(call.result({ type: 'value' })).resolves.toBeUndefined();
        expect(stack.activeCall).toBeUndefined();
    });

    it('settles the portal response a client is waiting on', async () => {
        const { stack } = makeStack();
        const response = Promise.withResolvers<unknown>();
        stack.portal.open.response = response;
        stack.portal.queue.active.push({ psuri: '1' });
        stack.portal.queue.backlog.push({ psuri: '2' });

        stack.dispose('Context destroyed while a call was pending.');

        await expect(response.promise).resolves.toMatchObject({ type: 'error', code: 'PageUnavailable' });
        expect(stack.portal.queue.active).toEqual([]);
        expect(stack.portal.queue.backlog).toEqual([]);
    });

    it('settles an initial call that was waiting behind the portal queue', async () => {
        const { stack } = makeStack();
        const call = makeCall();
        stack.portal.initial.call = call;

        stack.dispose('Page closed while a call was pending.');

        await expect(call.response.promise).resolves.toMatchObject({ code: 'PageUnavailable' });
    });

    it('leaves a call alone that finishes before the delayed disposal', async () => {
        vi.useFakeTimers();
        try {
            const { stack } = makeStack();
            const call = makeCall('quit');
            call.setStack(stack);
            stack.activeCall = call;

            stack.disposeAfter(1000, 'Page closed while a call was pending.');
            await call.result({ type: 'value', value: 'closed' });
            await vi.advanceTimersByTimeAsync(1000);

            await expect(call.response.promise).resolves.toEqual({ type: 'value', value: 'closed' });
        } finally {
            vi.useRealTimers();
        }
    });

    it('settles a hanging call after the delayed disposal', async () => {
        vi.useFakeTimers();
        try {
            const { stack } = makeStack();
            const call = makeCall();
            stack.activeCall = call;

            stack.disposeAfter(1000, 'Page closed while a call was pending.');
            await vi.advanceTimersByTimeAsync(1000);

            await expect(call.response.promise).resolves.toMatchObject({ code: 'PageUnavailable' });
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('CallStack portal failures', () => {
    function pendingRequest(overrides: Record<string, unknown> = {}) {
        const { context, stack } = makeStack(overrides);
        const handler = vi.fn().mockResolvedValue(undefined);
        const call = makeCall();
        stack.activeCall = call;
        stack.portal.queue.active.push({ psuri: '1' });
        context.psuriCache.set('1', { stack, handler });

        return { context, stack, handler, call };
    }

    it('reports a client failure instead of a response', async () => {
        const { stack, handler } = pendingRequest();

        await stack.handlePortalResponse({
            psuri: '1',
            type: 'PortalResponse',
            error: { reason: 'ConnectionRefused', message: 'connect ECONNREFUSED' },
        }, { resolve: vi.fn() });

        expect(handler).toHaveBeenCalledWith(
            { reason: 'ConnectionRefused', message: 'connect ECONNREFUSED' }, undefined, '', [],
        );
        expect(stack.portal.queue.active).toEqual([]);
    });

    it('passes HTTP error responses through as responses', async () => {
        const { stack, handler } = pendingRequest();

        await stack.handlePortalResponse({
            psuri: '1',
            type: 'PortalResponse',
            status: 503,
            headers: {},
            body: btoa('unavailable'),
        }, { resolve: vi.fn() });

        expect(handler).toHaveBeenCalledWith(undefined, 503, btoa('unavailable'), []);
    });

    it('falls back to a generic reason CDP accepts', async () => {
        const { stack, handler } = pendingRequest();

        await stack.handlePortalResponse({
            psuri: '1', type: 'PortalResponse', error: { reason: 'NotACdpReason' },
        }, { resolve: vi.fn() });

        expect(handler.mock.calls[0][0]).toMatchObject({ reason: 'Failed' });
    });

    it('treats a response without status or body as failed', async () => {
        const { context, stack, handler } = pendingRequest();

        await stack.handlePortalResponse({ psuri: '1', type: 'PortalResponse' }, { resolve: vi.fn() });

        expect(handler.mock.calls[0][0]).toMatchObject({ reason: 'Failed' });
        expect(context.psuriCache.has('1')).toBe(false);
    });

    it('fails the request and keeps the queue moving when delivery throws', async () => {
        const { context, stack, handler } = pendingRequest();
        handler.mockRejectedValueOnce(new Error('invalid response'));
        const next = { psuri: '2' };
        stack.portal.queue.active.push(next);
        context.psuriCache.set('2', { stack, handler: vi.fn() });
        const response = { resolve: vi.fn() };

        await stack.handlePortalResponse({
            psuri: '1', type: 'PortalResponse', status: 200, headers: {}, body: '',
        }, response);

        expect(handler).toHaveBeenLastCalledWith({ reason: 'Failed' }, 0, '', []);
        expect(response.resolve.mock.calls[0][0]).toMatchObject({ type: 'ServerRequest' });
        expect(stack.portal.queue.active).toEqual([next]);
    });

    it('fails requests the client never answers', async () => {
        vi.useFakeTimers();
        try {
            const { context, stack, handler } = pendingRequest({ portalTimeout: 5000 });
            const backlogged = vi.fn().mockResolvedValue(undefined);
            context.psuriCache.set('2', { stack, handler: backlogged });
            stack.portal.queue.backlog.push({ psuri: '2' });

            stack.createServerRequest(stack.portal.queue.active[0]);
            await vi.advanceTimersByTimeAsync(5000);

            expect(handler.mock.calls[0][0]).toMatchObject({ reason: 'TimedOut' });
            expect(backlogged.mock.calls[0][0]).toMatchObject({ reason: 'TimedOut' });
            expect(context.psuriCache.size).toBe(0);
            expect(stack.portal.queue.active).toEqual([]);
            expect(stack.portal.queue.backlog).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not time out once the client answered', async () => {
        vi.useFakeTimers();
        try {
            const { stack, handler } = pendingRequest({ portalTimeout: 5000 });

            stack.createServerRequest(stack.portal.queue.active[0]);
            await stack.handlePortalResponse({
                psuri: '1', type: 'PortalResponse', status: 200, headers: {}, body: '',
            }, { resolve: vi.fn() });
            await vi.advanceTimersByTimeAsync(5000);

            expect(handler).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });

    it('releases a finished call that only waited for the portal queue', () => {
        const { stack } = pendingRequest();
        const response = { resolve: vi.fn() };
        stack.portal.open.response = response;
        stack.portal.waiting.response = Return.Self().serialize();

        stack.failPortalRequests('Aborted', 'The client disconnected.');

        expect(response.resolve).toHaveBeenCalledWith(Return.Self().serialize());
        expect(stack.activeCall).toBeUndefined();
    });

    it('fails portal work when the waiting client disconnects', () => {
        const { context, stack, handler } = pendingRequest();
        const response = Promise.withResolvers<unknown>();
        stack.portal.open.response = response;

        stack.clientDisconnected(response);

        expect(handler.mock.calls[0][0]).toMatchObject({ reason: 'Aborted' });
        expect(stack.portal.open.response).toBeUndefined();
        expect(context.psuriCache.size).toBe(0);
    });

    it('ignores disconnects of unrelated clients', () => {
        const { stack, handler } = pendingRequest();

        stack.clientDisconnected(Promise.withResolvers<unknown>());

        expect(handler).not.toHaveBeenCalled();
    });

    it('drops a canceled request from the backlog', () => {
        const { context, stack } = makeStack();
        stack.portal.queue.backlog.push({ psuri: '1' }, { psuri: '2' });
        context.psuriCache.set('1', { stack });
        context.psuriCache.set('2', { stack });

        stack.cancelPortalRequest('1');

        expect(stack.portal.queue.backlog).toEqual([{ psuri: '2' }]);
        expect(context.psuriCache.has('1')).toBe(false);
    });

    it('keeps a canceled request the client is handling but ignores its answer', async () => {
        const { context, stack, handler } = pendingRequest();

        stack.cancelPortalRequest('1');
        expect(context.psuriCache.has('1')).toBe(true);

        await stack.handlePortalResponse({
            psuri: '1', type: 'PortalResponse', status: 200, headers: {}, body: '',
        }, { resolve: vi.fn() });

        expect(handler).not.toHaveBeenCalled();
        expect(stack.portal.queue.active).toEqual([]);
    });
});
