import {DomReplay, domPacketsUntil, type DomPoint} from '@puth/core';
import type ContextStore from '@/app/store/ContextStore';

const SCOPE = '/__replay/';
export const FRAME_URL = '/__replay/frame.html';
const CACHE = 'puth-replay-v1';
const BODY = '/__replay/body/';

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
 */
export class ReplayView {
    private replay: DomReplay;
    private shown?: {doc: string, keyframe: number, seq: number};
    private pending?: {context: ContextStore, point: DomPoint};
    private running?: Promise<void>;

    constructor(private readonly frame: HTMLIFrameElement, private readonly onShown: (viewport: [number, number]) => void) {
        const doc = frame.contentDocument!;
        this.replay = new DomReplay(doc);

        // Nothing recorded may navigate the frame away.
        const stop = (event: Event) => event.preventDefault();
        doc.addEventListener('click', stop, true);
        doc.addEventListener('auxclick', stop, true);
        doc.addEventListener('submit', stop, true);
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
        await replayWorker.prepare(context, packets[packets.length - 1].timestamp);

        const shown = this.shown;
        const forward = shown !== undefined && shown.doc === point.doc && shown.keyframe === keyframe.seq && shown.seq <= point.seq;
        if (! forward) {
            this.replay.build(keyframe.data);
        }
        for (const packet of packets) {
            if (packet.kind === 'changes' && (! forward || packet.seq > shown!.seq)) {
                this.replay.apply(packet.data);
            }
        }
        this.replay.restoreScroll();
        this.shown = {doc: point.doc, keyframe: keyframe.seq, seq: point.seq};
        // Tells tests and tools which point the frame shows, once it does.
        this.frame.setAttribute('data-shown', point.doc + ':' + point.seq);

        const [width, height] = this.replay.viewport;
        this.onShown([width, height]);
    }
}
