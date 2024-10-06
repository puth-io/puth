import ContextStore from '@/app/store/ContextStore';
import mitt, {Emitter, Handler} from 'mitt';
import {makeAutoObservable} from 'mobx';
import {decode, encode, ExtensionCodec} from '@msgpack/msgpack';
import {DebugStoreClass} from './DebugStoreClass.tsx';
import {logData} from '../util/Debugging.ts';
import Events from '../Events.tsx';
import AppStore from './AppStore.tsx';

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

export function EmitContextEvent(connection: Connection, context: TODO, type: string, arg?: TODO) {
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

export function EmitPuthEvent(connection: Connection, type: string, arg?: TODO) {
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
    public readonly app: AppStore;
    
    // @ts-ignore
    private websocket: WebSocket;
    public uri: string = '';
    
    private connectionTimeout = 2000;
    public connectionState: number = WebSocket.CLOSED;
    
    private totalBytesReceived: number = 0;
    
    public contexts: ContextStore[] = [];
    private emitter: Emitter<ConnectionEvents> = mitt<ConnectionEvents>();
    
    public active: {
        context?: ContextStore,
    } = {
        context: undefined,
    };
    
    constructor(app: AppStore) {
        makeAutoObservable(this);
        this.app = app;
    }
    
    public setActiveContext(context: ContextStore) {
        context.initializePreviewStore(); // TODO limit number of previewstores
        this.active.context = context;
    }
    
    retry() {
        return new Promise<Connection>((resolve, reject) => {
            if (this.connectionState !== WebSocket.CLOSED) {
                resolve(this);
                return;
            }
            if (this.uri === '') {
                console.warn('[Connection] No uri set. Hint: call connect() before retrying.', this);
                reject({code: 'missing', reason: 'Missing uri'});
                return;
            }
            
            resolve(this.connect(this.uri));
        });
    }
    
    destroy() {
        this.websocket.close();
    }
    
    connect(uri: string) {
        return new Promise<Connection>((resolve, reject) => {
            this.uri = uri;
            this.websocket = new WebSocket(this.uri);
            this.websocket.binaryType = 'arraybuffer';
            this.connectionState = this.websocket.readyState;
            
            const onOpen = () => {
                clearTimeout(timeoutTimer);
                this.connectionState = this.websocket.readyState;
                resolve(this);
            };
            const onClose = () => {
                clearTimeout(timeoutTimer);
                cleanup();
                this.connectionState = this.websocket.readyState;
                reject({code: 'closed', reason: 'Connection closed'});
            };
            const onMessage = (event: {data: ArrayBuffer;}) => {
                this.received(event.data);
            };
            this.websocket.addEventListener('open', onOpen);
            this.websocket.addEventListener('close', onClose);
            this.websocket.addEventListener('message', onMessage);
            
            const cleanup = () => {
                this.websocket.removeEventListener('open', onOpen);
                this.websocket.removeEventListener('close', onClose);
                this.websocket.removeEventListener('message', onMessage);
            };
            
            const timeoutTimer = setTimeout(() => {
                if (this.websocket.readyState === WebSocket.CONNECTING) {
                    cleanup();
                    this.websocket.close();
                    reject({code: 'timeout', reason: 'Connection timeout reached (2s)'});
                }
            }, this.connectionTimeout);
        });
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
        if (! context) {
            console.log('ignored packet because no context was initialized', packet);
            return;
        }
        
        context.received(packet);
        
        Events.emit('context:received', {context, packet});
        this.emit('context:received', {context, packet});
    }
    
    getContext(id: string): ContextStore|undefined {
        return this.contexts.find(context => context.id === id);
    }
    
    get hasNoContexts() {
        return this.contexts.length === 0;
    }
    
    get isForeground() {
        return this.app.active.connection === this;
    }
    
    get isConnected() {
        return this.connectionState === WebSocket.OPEN;
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
