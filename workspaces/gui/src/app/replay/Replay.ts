import {DomReplay, domFrameDocument, domPacketsUntil, type DomPoint, domSeqAt} from '@puth/core';
import type ContextStore from '@/app/store/ContextStore';

const SCOPE = '/__replay/';
export const FRAME_URL = '/__replay/frame.html';
const CACHE = 'puth-replay-v1';
const BODY = '/__replay/body/';

/**
 * Identifies a point with the documents of its frames: two points can share the top document's batch and still
 * differ in a frame, like before and after a frame navigated.
 */
export function domPointKey(point: DomPoint): string {
    const frames = Object.entries(point.frames ?? {}).sort(([a], [b]) => a < b ? -1 : 1).map(([doc, seq]) => doc + ':' + seq);
    return [point.doc + ':' + point.seq, ...frames].join(' ');
}

type ResourceMap = Record<string, [hash: string, status: number, contentType: string]>;

/**
 * The replay's service worker. It answers every request of a replay document from the recording, so a page that
 * is not controlled by it must not be built.
 */
class ReplayWorker {
    private registration?: Promise<ServiceWorker|null>;
    private written = new Set<string>();
    private lastMap = '';

    ready(): Promise<ServiceWorker|null> {
        this.registration ??= this.register();
        return this.registration;
    }

    private async register(): Promise<ServiceWorker|null> {
        if (! ('serviceWorker' in navigator)) {
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.register(SCOPE + 'sw.js', {scope: SCOPE});
            return await activated(registration);
        } catch (error) {
            // Without a server, updating fails while the registration still works.
            const registration = await navigator.serviceWorker.getRegistration(SCOPE).catch(() => undefined);
            if (registration !== undefined) {
                return activated(registration);
            }
            console.warn('[Replay] Service worker unavailable', error);
            return null;
        }
    }

    /** Stores the bodies the replay of point needs and tells the worker which URL serves which one. */
    async prepare(context: ContextStore, until: number) {
        const worker = await this.ready();
        if (worker === null) {
            return;
        }

        const map: ResourceMap = {};
        const chosen = new Map<string, any>();
        // A URL serves the body recorded last before the point, or the first one after it: fonts and images load
        // when they are needed, which can be later than the point being shown.
        for (const resource of context.domResources) {
            for (const url of resource.urls ?? [resource.url]) {
                const current = chosen.get(url);
                if (current === undefined
                    || (resource.timestamp <= until && (current.timestamp > until || resource.timestamp > current.timestamp))) {
                    chosen.set(url, resource);
                }
            }
        }

        const cache = await caches.open(CACHE);
        for (const [url, resource] of chosen) {
            const hash = resource.contentHash;
            if (hash === undefined) {
                continue;
            }
            if (! this.written.has(hash)) {
                const content = context.responseContent(resource);
                if (content === undefined) {
                    continue;
                }
                await cache.put(BODY + hash, new Response(content as BufferSource));
                this.written.add(hash);
            }
            map[url] = [hash, resource.status, resource.contentType];
        }

        const serialized = JSON.stringify(map);
        if (serialized === this.lastMap) {
            return;
        }
        this.lastMap = serialized;
        await ask(worker, {type: 'map', map});
    }
}

export const replayWorker = new ReplayWorker();

function activated(registration: ServiceWorkerRegistration): Promise<ServiceWorker|null> {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    if (worker === null) {
        return Promise.resolve(null);
    }
    if (worker.state === 'activated') {
        return Promise.resolve(worker);
    }
    return new Promise((resolve) => {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
                resolve(worker);
            } else if (worker.state === 'redundant') {
                resolve(registration.active);
            }
        });
    });
}

function ask(worker: ServiceWorker, message: any): Promise<unknown> {
    const channel = new MessageChannel();
    return new Promise((resolve) => {
        channel.port1.onmessage = (event) => resolve(event.data);
        worker.postMessage(message, [channel.port2]);
        setTimeout(resolve, 3000);
    });
}

/**
 * Shows points of a context's DOM recording in one replay frame. Moving forward within a document applies only the
 * new batches, anything else rebuilds from the last keyframe before the point.
 *
 * Recorded iframes become replay frames of their own, absolute on the GUI's origin because the rebuilt document's
 * base points at the recorded page. Each shows the document linked to it, nested as deep as the recording goes.
 */
export class ReplayView {
    private replay: DomReplay;
    private readonly doc: Document;
    private shown?: {doc: string, keyframe: number, seq: number};
    private children = new Map<number, ReplayView>();
    private pending?: {context: ContextStore, point: DomPoint};
    private running?: Promise<void>;

    constructor(
        private readonly frame: HTMLIFrameElement,
        private readonly onShown: (viewport: [number, number]) => void,
        private readonly depth = 0,
    ) {
        this.doc = frame.contentDocument!;
        // Chrome doesn't load a frame whose address its ancestors have twice already, so each level has its own.
        this.replay = new DomReplay(this.doc, {frameSrc: new URL(`${FRAME_URL}?depth=${depth + 1}`, location.origin).href});

        // Nothing recorded may navigate the frame away.
        const stop = (event: Event) => event.preventDefault();
        this.doc.addEventListener('click', stop, true);
        this.doc.addEventListener('auxclick', stop, true);
        this.doc.addEventListener('submit', stop, true);
    }

    static controlled(frame: HTMLIFrameElement): boolean {
        try {
            return frame.contentWindow?.navigator.serviceWorker?.controller != null;
        } catch {
            return false;
        }
    }

    /** Only the latest point counts, so moving the mouse over many steps doesn't queue up rebuilds. */
    show(context: ContextStore, point: DomPoint) {
        this.pending = {context, point};
        this.running ??= this.run().finally(() => this.running = undefined);
    }

    private async run() {
        while (this.pending !== undefined) {
            const {context, point} = this.pending;
            this.pending = undefined;
            await this.render(context, point);
        }
    }

    private async render(context: ContextStore, point: DomPoint) {
        const packets = domPacketsUntil(context.domPacketsOf(point.doc), point.seq);
        if (packets.length === 0) {
            return;
        }
        const keyframe = packets[0];
        const time = packets[packets.length - 1].timestamp;
        await replayWorker.prepare(context, time);

        const shown = this.shown;
        const forward = shown !== undefined && shown.doc === point.doc && shown.keyframe === keyframe.seq && shown.seq <= point.seq;
        if (! forward) {
            this.replay.build(keyframe.data, keyframe.strings);
            this.children.clear();
        }
        for (const packet of packets) {
            if (packet.kind === 'changes' && (! forward || packet.seq > shown!.seq)) {
                this.replay.apply(packet.data, packet.strings);
            }
        }
        // Positions near the end of a page only fit into a frame of the recorded size. Nested frames have the size the
        // rebuilt page around them gives them, the top frame is sized here before the preview catches up.
        if (this.depth === 0) {
            const [width, height] = this.replay.viewport;
            this.frame.style.width = `${width}px`;
            this.frame.style.height = `${height}px`;
        }
        this.replay.restoreScroll();
        this.shown = {doc: point.doc, keyframe: keyframe.seq, seq: point.seq};

        await this.renderFrames(context, point, time);

        // Tells tests and tools which point the frame shows, once it does, frames included.
        this.frame.setAttribute('data-shown', domPointKey(point));
        const [width, height] = this.replay.viewport;
        this.onShown([width, height]);
    }

    private async renderFrames(context: ContextStore, point: DomPoint, time: number) {
        const links = context.domFramesOf(point.doc);
        if (links.length === 0) {
            return;
        }

        await Promise.all(this.replay.frames().map(async ([owner, element]) => {
            const doc = domFrameDocument(links, owner, point.frames, time, (candidate) => domSeqAt(context.domPacketsOf(candidate), time) !== undefined);
            if (doc === undefined) {
                return;
            }
            const seq = point.frames?.[doc] ?? domSeqAt(context.domPacketsOf(doc), time);
            if (seq === undefined) {
                return;
            }

            // Moving an iframe reloads it, which takes the document built into it along.
            let child = this.children.get(owner);
            if (child === undefined || child.frame !== element || child.doc !== element.contentDocument) {
                this.children.delete(owner);
                if (! await loaded(element) || ! ReplayView.controlled(element)) {
                    return;
                }
                child = new ReplayView(element, () => {}, this.depth + 1);
                this.children.set(owner, child);
            }
            await child.render(context, {page: point.page, doc, seq, frames: point.frames});
        }));
    }
}

// A replay frame is ready once the replay page loaded in it, not its initial empty document.
function loaded(frame: HTMLIFrameElement): Promise<boolean> {
    const page = new URL(FRAME_URL, location.origin).href;
    const ready = () => {
        try {
            const doc = frame.contentDocument;
            return doc !== null && doc.URL.startsWith(page) && doc.readyState === 'complete';
        } catch {
            return false;
        }
    };
    if (ready()) {
        return Promise.resolve(true);
    }
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(ready()), 5000);
        frame.addEventListener('load', () => {
            clearTimeout(timer);
            resolve(ready());
        }, {once: true});
    });
}
