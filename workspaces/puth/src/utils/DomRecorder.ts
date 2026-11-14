import type {CDPSession, Protocol} from 'puppeteer-core';
import type {DomPoint} from '@puth/core';
import {DOM_RECORDER_SOURCE} from './DomRecorderSource';

export const DOM_RECORDER_WORLD = 'puth-recorder';
const BINDING = '__puthDom';
const FLUSH_TIMEOUT = 1000;

type Logger = { debug: (...args: any[]) => void, warn: (...args: any[]) => void };

export type DomRecorderPacket = {
    kind: 'keyframe'|'changes';
    doc: string;
    seq: number;
    data: any;
    marker?: string;
};

/**
 * Records the DOM of a page's top frame through the recorder in DomRecorderSource, and tells where the recording
 * stands when a command starts.
 *
 * The recorder's binding events and the answer to a flush come over the same session, events first. So everything
 * a flush sent has arrived when it returns.
 */
export class DomRecorder {
    private contextId?: number;
    private lastSeq = new Map<string, number>();
    private resyncing = new Set<string>();
    private disposed = false;

    private constructor(
        private readonly cdp: CDPSession,
        private mainFrameId: string,
        readonly page: number,
        private readonly push: (packet: DomRecorderPacket) => void,
        private readonly logger?: Logger,
    ) {}

    // Needs Page.enable on the session, which PageStability already sent; scripts on new documents only run then.
    static async install(
        cdp: CDPSession,
        page: number,
        register: (event: string, handler: (event: any) => void) => void,
        push: (packet: DomRecorderPacket) => void,
        logger?: Logger,
    ): Promise<DomRecorder> {
        const {frameTree} = await cdp.send('Page.getFrameTree');
        const recorder = new DomRecorder(cdp, frameTree.frame.id, page, push, logger);

        register('Runtime.executionContextCreated', event => recorder.contextCreated(event));
        register('Runtime.executionContextDestroyed', ({executionContextId}) => {
            if (executionContextId === recorder.contextId) {
                recorder.contextId = undefined;
            }
        });
        register('Runtime.executionContextsCleared', () => recorder.contextId = undefined);
        register('Runtime.bindingCalled', event => recorder.received(event));
        register('Page.frameNavigated', ({frame}) => {
            if (frame.parentId === undefined) {
                recorder.mainFrameId = frame.id;
            }
        });

        await cdp.send('Runtime.addBinding', {name: BINDING, executionContextName: DOM_RECORDER_WORLD});
        await cdp.send('Runtime.enable');
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
            source: DOM_RECORDER_SOURCE,
            worldName: DOM_RECORDER_WORLD,
            runImmediately: true,
        });

        return recorder;
    }

    private contextCreated({context}: Protocol.Runtime.ExecutionContextCreatedEvent) {
        if (context.name === DOM_RECORDER_WORLD && context.auxData?.frameId === this.mainFrameId) {
            this.contextId = context.id;
        }
    }

    private received({name, payload, executionContextId}: Protocol.Runtime.BindingCalledEvent) {
        if (name !== BINDING || this.disposed) {
            return;
        }

        let message: DomRecorderPacket;
        try {
            message = JSON.parse(payload);
        } catch (error) {
            this.logger?.warn({error}, 'Could not read a DOM recording message');
            return;
        }

        // A lost batch would leave the rebuilt document wrong until the next keyframe, so ask for one right away.
        const last = this.lastSeq.get(message.doc);
        if (last !== undefined && message.seq !== last + 1 && message.kind !== 'keyframe') {
            this.logger?.warn({doc: message.doc, expected: last + 1, got: message.seq}, 'DOM recording has a gap');
            void this.resync(message.doc, executionContextId);
        }
        if (message.kind === 'keyframe') {
            this.resyncing.delete(message.doc);
        }
        this.lastSeq.set(message.doc, message.seq);

        this.push(message);
    }

    private async resync(doc: string, contextId: number) {
        if (this.resyncing.has(doc)) {
            return;
        }
        this.resyncing.add(doc);
        await this.evaluate('globalThis.__puthRecorder && globalThis.__puthRecorder.resync()', contextId);
    }

    /**
     * Sends what changed since the last batch and returns where the recording stands. Without a recorder, like
     * while the page navigates, there is nothing to tell.
     */
    async flush(marker?: string): Promise<DomPoint|undefined> {
        if (this.contextId === undefined || this.disposed) {
            return undefined;
        }
        const point = await this.evaluate(
            `globalThis.__puthRecorder && globalThis.__puthRecorder.flush(${JSON.stringify(marker ?? null)})`,
            this.contextId,
        );

        return point?.doc === undefined ? undefined : {page: this.page, doc: point.doc, seq: point.seq};
    }

    private async evaluate(expression: string, contextId: number) {
        let timer: ReturnType<typeof setTimeout>|undefined;
        try {
            // A dialog that opens meanwhile stops the page's scripts; the command must not wait for it.
            const {result} = await Promise.race([
                this.cdp.send('Runtime.evaluate', {expression, contextId, returnByValue: true}),
                new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DOM recorder did not answer')), FLUSH_TIMEOUT); }),
            ]);
            return result.value;
        } catch (error) {
            // The document went away during the call, its recorder flushed before it unloaded.
            this.logger?.debug({error}, 'Could not reach the DOM recorder');
            return undefined;
        } finally {
            clearTimeout(timer);
        }
    }

    dispose() {
        this.disposed = true;
        this.contextId = undefined;
    }
}
