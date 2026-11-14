import type {CDPSession, Protocol} from 'puppeteer-core';
import type {DomPoint} from '@puth/core';
import {DOM_RECORDER_SOURCE} from './DomRecorderSource';

export const DOM_RECORDER_WORLD = 'puth-recorder';
const BINDING = '__puthDom';
const FLUSH_TIMEOUT = 1000;

type Logger = { debug: (...args: any[]) => void, warn: (...args: any[]) => void };
type Register = (object: any, event: string, handler: (event: any) => void) => void;

export type DomRecorderPacket = {
    kind: 'keyframe'|'changes';
    doc: string;
    seq: number;
    data: any;
    marker?: string;
};

export type DomFrameLink = {
    parentDoc: string;
    owner: number;
    doc: string;
};

type Frame = {
    parent?: string;
    // The recorder of the frame's current document, in the session of the process that renders the frame.
    session?: CDPSession;
    contextId?: number;
    doc?: string;
};

/**
 * Records the DOM of a page and of all frames in it, through the recorder in DomRecorderSource, and tells where the
 * recording stands when a command starts.
 *
 * Frames of other sites run in processes of their own. The page's session attaches to them before they run, so their
 * recorder is in place from the start, and so on for frames in them.
 *
 * A recorder's binding events and the answer to a flush come over the same connection, events first. So everything
 * a flush sent has arrived when it returns.
 */
export class DomRecorder {
    private frames = new Map<string, Frame>();
    private contexts = new Map<string, string>();
    private lastSeq = new Map<string, number>();
    private resyncing = new Set<string>();
    private linked = new Set<string>();
    private disposed = false;

    private constructor(
        private readonly cdp: CDPSession,
        private mainFrameId: string,
        readonly page: number,
        private readonly register: Register,
        private readonly push: (packet: DomRecorderPacket) => void,
        private readonly link: (link: DomFrameLink) => void,
        private readonly logger?: Logger,
    ) {}

    // The page's session has Page.enable from PageStability already; scripts on new documents only run then.
    static async install(
        cdp: CDPSession,
        page: number,
        register: Register,
        push: (packet: DomRecorderPacket) => void,
        link: (link: DomFrameLink) => void,
        logger?: Logger,
    ): Promise<DomRecorder> {
        const {frameTree} = await cdp.send('Page.getFrameTree');
        const recorder = new DomRecorder(cdp, frameTree.frame.id, page, register, push, link, logger);

        const visit = (node: Protocol.Page.FrameTree, parent?: string) => {
            recorder.frame(node.frame.id).parent = parent;
            node.childFrames?.forEach(child => visit(child, node.frame.id));
        };
        visit(frameTree);
        register(cdp, 'Page.frameNavigated', ({frame}) => {
            if (frame.parentId === undefined) {
                recorder.mainFrameId = frame.id;
            }
        });

        await recorder.attach(cdp, false);

        return recorder;
    }

    private frame(id: string): Frame {
        let frame = this.frames.get(id);
        if (frame === undefined) {
            frame = {};
            this.frames.set(id, frame);
        }
        return frame;
    }

    private async attach(session: CDPSession, enablePage: boolean) {
        const sessionId = session.id();
        const key = (contextId: number) => sessionId + ':' + contextId;

        this.register(session, 'Runtime.executionContextCreated', ({context}: Protocol.Runtime.ExecutionContextCreatedEvent) => {
            const frameId = context.auxData?.frameId;
            if (context.name === DOM_RECORDER_WORLD && frameId !== undefined) {
                this.contexts.set(key(context.id), frameId);
                Object.assign(this.frame(frameId), {session, contextId: context.id});
            }
        });
        this.register(session, 'Runtime.executionContextDestroyed', ({executionContextId}) => {
            const frameId = this.contexts.get(key(executionContextId));
            this.contexts.delete(key(executionContextId));
            const frame = frameId === undefined ? undefined : this.frames.get(frameId);
            if (frame?.session === session && frame.contextId === executionContextId) {
                frame.contextId = undefined;
            }
        });
        this.register(session, 'Runtime.executionContextsCleared', () => {
            for (const frame of this.frames.values()) {
                if (frame.session === session) {
                    frame.contextId = undefined;
                }
            }
        });
        this.register(session, 'Runtime.bindingCalled', event => this.received(session, key(event.executionContextId), event));
        this.register(session, 'Page.frameAttached', ({frameId, parentFrameId}) => {
            this.frame(frameId).parent = parentFrameId;
        });
        this.register(session, 'Page.frameDetached', ({frameId, reason}) => {
            // A frame that moves to a process of its own stays.
            if (reason !== 'swap') {
                this.frames.delete(frameId);
            }
        });
        this.register(session, 'Target.attachedToTarget', (event: Protocol.Target.AttachedToTargetEvent) => void this.attached(event));

        if (enablePage) {
            await session.send('Page.enable');
        }
        await session.send('Runtime.addBinding', {name: BINDING, executionContextName: DOM_RECORDER_WORLD});
        await session.send('Runtime.enable');
        await session.send('Page.addScriptToEvaluateOnNewDocument', {
            source: DOM_RECORDER_SOURCE,
            worldName: DOM_RECORDER_WORLD,
            runImmediately: true,
        });
        await session.send('Target.setAutoAttach', {
            autoAttach: true,
            waitForDebuggerOnStart: true,
            flatten: true,
            filter: [{type: 'iframe'}],
        });
    }

    // A frame of another site waits until every client that attached to it lets it run, so it always has to.
    private async attached({sessionId, targetInfo}: Protocol.Target.AttachedToTargetEvent) {
        const session = this.cdp.connection()?.session(sessionId);
        if (session == null) {
            return;
        }
        try {
            if (! this.disposed && targetInfo.type === 'iframe') {
                await this.attach(session, true);
            }
        } catch (error) {
            this.logger?.debug({error}, 'Could not record the DOM of a frame');
        } finally {
            await session.send('Runtime.runIfWaitingForDebugger').catch(() => {});
        }
    }

    private received(session: CDPSession, contextKey: string, {name, payload, executionContextId}: Protocol.Runtime.BindingCalledEvent) {
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
            void this.resync(message.doc, session, executionContextId);
        }
        if (message.kind === 'keyframe') {
            this.resyncing.delete(message.doc);
        }
        this.lastSeq.set(message.doc, message.seq);

        const frameId = this.contexts.get(contextKey);
        if (frameId !== undefined) {
            this.frame(frameId).doc = message.doc;
        }

        this.push(message);

        if (frameId !== undefined && frameId !== this.mainFrameId && ! this.linked.has(message.doc)) {
            void this.linkFrame(frameId, message.doc);
        }
    }

    // Finds the iframe element that shows the frame, in the parent's recorder.
    private async linkFrame(frameId: string, doc: string) {
        const parent = this.frames.get(this.frames.get(frameId)?.parent ?? '');
        if (parent?.session === undefined || parent.contextId === undefined || this.linked.has(doc)) {
            return;
        }
        this.linked.add(doc);

        try {
            const {backendNodeId} = await parent.session.send('DOM.getFrameOwner', {frameId});
            const {object} = await parent.session.send('DOM.resolveNode', {backendNodeId, executionContextId: parent.contextId});
            const {result} = await parent.session.send('Runtime.callFunctionOn', {
                objectId: object.objectId!,
                functionDeclaration: 'function () { const recorder = globalThis.__puthRecorder; return recorder ? [recorder.doc, recorder.idOf(this)] : null; }',
                returnByValue: true,
            });
            void parent.session.send('Runtime.releaseObject', {objectId: object.objectId!}).catch(() => {});

            if (Array.isArray(result.value) && ! this.disposed) {
                this.link({parentDoc: result.value[0], owner: result.value[1], doc});
            }
        } catch (error) {
            // The frame or its parent went away meanwhile; the next message of the frame tries again.
            this.linked.delete(doc);
            this.logger?.debug({error}, 'Could not find the element of a frame');
        }
    }

    private async resync(doc: string, session: CDPSession, contextId: number) {
        if (this.resyncing.has(doc)) {
            return;
        }
        this.resyncing.add(doc);
        await this.evaluate(session, contextId, 'globalThis.__puthRecorder && globalThis.__puthRecorder.resync()');
    }

    /**
     * Sends what changed since the last batch in every frame and returns where the recording stands. Without a
     * recorder in the top frame, like while the page navigates, there is nothing to tell.
     */
    async flush(marker?: string): Promise<DomPoint|undefined> {
        if (this.disposed) {
            return undefined;
        }

        const expression = `globalThis.__puthRecorder && globalThis.__puthRecorder.flush(${JSON.stringify(marker ?? null)})`;
        const flushed = await Promise.all([...this.frames].map(async ([id, frame]) => {
            if (frame.session === undefined || frame.contextId === undefined) {
                return undefined;
            }
            const point = await this.evaluate(frame.session, frame.contextId, expression);
            return point?.doc === undefined ? undefined : {id, doc: point.doc as string, seq: point.seq as number};
        }));

        const top = flushed.find(point => point?.id === this.mainFrameId);
        if (top === undefined) {
            return undefined;
        }

        const frames: Record<string, number> = {};
        for (const point of flushed) {
            if (point !== undefined && point !== top) {
                frames[point.doc] = point.seq;
            }
        }

        return {page: this.page, doc: top.doc, seq: top.seq, ...(Object.keys(frames).length > 0 ? {frames} : {})};
    }

    private async evaluate(session: CDPSession, contextId: number, expression: string) {
        let timer: ReturnType<typeof setTimeout>|undefined;
        try {
            // A dialog that opens meanwhile stops the page's scripts; the command must not wait for it.
            const {result} = await Promise.race([
                session.send('Runtime.evaluate', {expression, contextId, returnByValue: true}),
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
        this.frames.clear();
    }
}
