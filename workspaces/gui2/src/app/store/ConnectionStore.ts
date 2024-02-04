import ContextStore from "@/app/store/ContextStore";
import mitt, {Emitter, Handler} from "mitt";
import {makeAutoObservable} from 'mobx';
import {decode, encode, ExtensionCodec} from "@msgpack/msgpack";
import {DebugStoreClass} from "./DebugStoreClass.tsx";
import {logData} from "../util/Debugging.ts";
import Events from "../Events.tsx";

export const PUTH_EXTENSION_CODEC = new ExtensionCodec();

PUTH_EXTENSION_CODEC.register({
    type: 0,
    encode: (object: unknown): Uint8Array|null => {
        if (object instanceof Function) {
            return new TextEncoder().encode((object as () => void).toString());
        }
        
        return null;
    },
    decode: (data: Uint8Array) => {
        return new TextDecoder().decode(data);
    },
});

export type ConnectionEvents = {
    'context:created': ContextStore;
    'context:received': {context: ContextStore, packet: any};
    'context:event': [ContextStore, any];
    'context:event:screencast': {context: ContextStore, packet: any};
};

export function EmitContextEvent(connection: Connection, context, type, arg?) {
    connection.send({
        // namespace: 'events',
        type: 'event',
        on: 'context',
        context,
        event: {
            type,
            arg,
        },
    });
}

export function EmitPuthEvent(connection: Connection, type, arg?) {
    connection.send({
        // namespace: 'events',
        type: 'event',
        on: 'puth',
        event: {
            type,
            arg,
        },
    });
}

export class Connection {
    // @ts-ignore
    private websocket: WebSocket;
    public uri: string;
    
    private retryTimeout = 5000;
    private connectionTimeout = 2000;
    public connectionState: number = WebSocket.CLOSED;
    
    private totalBytesReceived: number = 0;
    
    public contexts: ContextStore[] = [];
    private emitter: Emitter<ConnectionEvents> = mitt<ConnectionEvents>();
    
    public active: {
        context?: ContextStore,
    } = {
        context: undefined,
    }
    
    public preview :any;
    
    constructor(uri: string, previewStore: any) {
        this.uri = uri;
        this.connect(this.uri);
        
        this.preview = previewStore;
        
        makeAutoObservable(this);
    }
    
    retry() {
        if (this.connectionState !== WebSocket.CLOSED) {
            return;
        }
        
        this.connect(this.uri);
    }
    
    connect(uri: string) {
        this.uri = uri;
        this.websocket = new WebSocket(this.uri);
        this.websocket.binaryType = 'arraybuffer';
        
        this.connectionState = this.websocket.readyState;
        
        const timeoutTimer = setTimeout(() => {
            if (this.websocket.readyState === WebSocket.CONNECTING) {
                this.websocket.close();
            }
        }, this.connectionTimeout);
        
        this.websocket.onopen = (event) => {
            clearTimeout(timeoutTimer);
            this.connectionState = this.websocket.readyState;
        };
        this.websocket.onclose = (event) => {
            setTimeout(() => {
                if (this.connectionState === WebSocket.CLOSED) {
                    this.connect(this.uri);
                }
            }, this.retryTimeout);
            this.connectionState = this.websocket.readyState;
        };
        this.websocket.onmessage = event => {
            this.received(event.data);
        };
    }
    
    send(packet: any) {
        if (this.websocket.readyState !== WebSocket.OPEN) {
            console.error('Did not send packet because websocket was not open', packet);
            return;
        }
        
        let data = encode(packet, {extensionCodec: PUTH_EXTENSION_CODEC});
        this.websocket.send(data);
    }
    
    private received(binary: ArrayBuffer) {
        // pMark('packet.received');
        this.totalBytesReceived += binary.byteLength;
        let dateBeforeParse = Date.now();
        
        let data = decode(binary, {extensionCodec: PUTH_EXTENSION_CODEC});
        
        // pMeasure('decode', 'packet.received');
        let dateAfterParse = Date.now();
        
        // // @ts-ignore
        // if (options?.returnIfExists && data.length > 0 && this.contexts.has(data[0]?.context?.id ?? data[0]?.id)) {
        //     alert('Context with same UUID already exists.');
        //     return;
        // }
        
        // @ts-ignore
        if (Array.isArray(data)) {
            for (let p of data) {
                this.receivedPacket(p);
            }
        } else {
            this.receivedPacket(data);
        }
        
        let dateAfterProcessing = Date.now();
        // pMeasure('proc', 'decode');
        DebugStoreClass(() => {
            // tslint:disable
            let size = (binary.byteLength / 1000 / 1000).toFixed(2);
            
            console.group('Packet received');
            
            console.groupCollapsed('Events', Array.isArray(data) ? data.length : 1);
            logData(data);
            console.groupEnd();
            
            console.log('Size', size, 'mb');
            
            console.log('Delta time parse', dateAfterParse - dateBeforeParse, 'ms');
            console.log('Delta time proc.', dateAfterProcessing - dateAfterParse, 'ms');
            console.log('Delta time debug', Date.now() - dateAfterProcessing, 'ms');
            
            console.groupEnd();
            // tslint:enable
        });
        // pMeasure('debug', 'proc');
    }
    
    private receivedPacket(packet: any) {
        // special case if context is created
        if (packet.type === 'context') {
            let context = new ContextStore(packet, this);
            this.contexts.unshift(context);
            Events.emit('context:created', context);
            this.emit('context:created', context);
            
            // if (AppStore.mode === 'follow' && AppStore.active.connection === this) {
            //     PreviewStore.activeCommand = undefined;
            //     PreviewStore.activeContext = context;
            // }
            
            return;
        }
        
        let context = this.getContext(packet.context.id);
        if (!context) {
            console.log('ignored packet because no context was initialized', packet);
            return;
        }
        
        context.received(packet);
        
        // TODO update
        // if (AppStore.mode === 'follow' && AppStore.active.connection === this && ! PreviewStore.activeContext) {
        //     PreviewStore.activeCommand = undefined;
        //     PreviewStore.activeContext = context;
        // }
        
        Events.emit('context:received', {context, packet});
        this.emit('context:received', {context, packet});
    }
    
    getContext(id: string): ContextStore|undefined {
        return this.contexts.find(context => context.id === id);
    }
    
    get hasNoContexts() {
        return this.contexts.length === 0;
    }
    
    getTotalBytesReceived() {
        return this.totalBytesReceived;
    }
    
    getMetrics() {
        let metrics = {
            contexts: this.contexts.length,
            events: 0,
        };
        
        this.contexts.forEach((ctx) => {
            metrics.events += ctx.commands.length;
            metrics.events += ctx.logs.length;
            // metrics.events += ctx.requests.length;
            // metrics.events += ctx.responses.length;
        });
        
        return metrics;
    }
    
    clear() {
        // this.contexts.forEach(function cleanupContext(context) {
        //     context.responses.forEach((response) => {
        //         // @ts-ignore
        //         if (response.contentParsed?.blob) {
        //             // @ts-ignore
        //             BlobHandler.revoke(response.contentParsed.blob.url);
        //         }
        //     });
        // });
        // this.contexts.clear();
    }
    
    on<Key extends keyof ConnectionEvents>(type: Key, handler: Handler<ConnectionEvents[Key]>) {
        return this.emitter.on(type, handler);
    }
    
    off<Key extends keyof ConnectionEvents>(type: Key, handler: Handler<ConnectionEvents[Key]>) {
        return this.emitter.on(type, handler);
    }
    
    emit<Key extends keyof ConnectionEvents>(type: Key, event: ConnectionEvents[Key]) {
        return this.emitter.emit(type, event);
    }
}
