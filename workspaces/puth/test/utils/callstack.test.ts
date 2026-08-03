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

function makeStack() {
    const page = {};
    const context = {
        caches: { dialog: new Map() },
        waitingForDialog: [],
        puth: { logger },
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
});
