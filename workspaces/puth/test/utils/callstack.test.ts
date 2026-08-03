import { describe, expect, it, vi } from 'vitest';
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
        const cdp = makeEventTarget({ send: vi.fn().mockResolvedValue(undefined) });
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
});
