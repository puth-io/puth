import {action, computed, makeObservable, observable, toJS} from 'mobx';
import Constructors from 'puth/src/context/Constructors';
import {encode} from '@msgpack/msgpack';
import {Connection, PUTH_EXTENSION_CODEC} from './ConnectionStore';
import PreviewStore from '@/app/store/PreviewStore';
import AppStore from './AppStore.tsx';

export default class ContextStore {
    readonly id: string;
    
    commands: any[] = [];
    logs: any[] = [];
    screencasts: any[] = [];
    unspecific: any[] = [];
    renderedEvents: any[] = [];
    
    group: string = '';
    test: {
        name: string;
        status: undefined|'failed'|'successful';
    } = {
        name: '',
        status: undefined,
    };
    
    options: {
        [key: string]: any;
    };
    capabilities: {
        [key: string]: boolean;
    };
    
    readonly createdAt: number;
    lastActivity: number;
    
    readonly original: any;
    app: AppStore;
    connection?: Connection;
    
    public preview: PreviewStore|null = null;
    
    public followIncoming = true;
    
    constructor(
        packet: any,
        app: AppStore,
        connection?: Connection,
    ) {
        this.original = packet;
        this.app = app;
        this.connection = connection;
        
        let {id, options, test, group, capabilities, timestamp} = packet;
        this.id = id;
        this.options = options;
        this.test = test;
        this.group = group;
        this.capabilities = capabilities;
        this.createdAt = timestamp;
        this.lastActivity = timestamp;
        
        this.preview = null;
        
        this.initializePreviewStore();
        
        makeObservable(this, {
            commands: observable,
            logs: observable,
            screencasts: observable,
            unspecific: observable,
            group: observable,
            test: observable,
            options: observable,
            capabilities: observable,
            lastActivity: observable,
            connection: observable,
            followIncoming: observable,
            renderedEvents: observable,
            
            initializePreviewStore: action,
            received: action,
            getEventTime: action,
            packets: action,
            blob: action,
            
            took: computed,
            isForeground: computed,
        });
    }
    
    initializePreviewStore() {
        if (this.preview !== null) {
            console.warn('[Context] Already initialized preview store');
            return;
        }
        this.preview = new PreviewStore(this);
        
        if (this.renderedEvents.length !== 0) {
            this.preview.toggleCommand(this.renderedEvents[this.renderedEvents.length - 1]);
        }
    }
    
    received(packet: any) {
        packet.context = this;
        
        if (packet.type === 'command') {
            this.commands.push(packet);
            
            if ([Constructors.Page, Constructors.ElementHandle, 'Browser'].includes(packet.on.type)) {
                this.pushRenderedPacket(packet);
            }
        } else if (packet.type === 'log') {
            this.logs.push(packet);
            this.pushRenderedPacket(packet);
        } else if (packet.type === 'test') {
            if (packet.specific === 'status') {
                this.test.status = packet.status;
            }
            this.unspecific.push(packet);
        } else if (packet.type === 'screencasts') {
            this.screencasts.push(packet);
        } else {
            console.log('unhandled event packet', packet);
            this.unspecific.push(packet);
        }
        
        let last = (packet?.time?.finished > packet.timestamp) ? packet.time.finished : packet.timestamp;
        if (last > this.lastActivity) {
            this.lastActivity = last;
        }
    }
    
    private pushRenderedPacket(packet: any) {
        if (this.renderedEvents.length === 0 || this.renderedEvents[this.renderedEvents.length - 1].timestamp < packet.timestamp) {
            this.renderedEvents.push(packet);
        } else {
            let index = this.renderedEvents.findIndex(item => item.timestamp > packet.timestamp);
            this.renderedEvents.splice(index, 0, packet);
        }
        
        if (this.isForeground && this.followIncoming && this.preview !== null) {
            let count = this.renderedEvents.length;
            if (count !== 1) {
                if (this.renderedEvents[count - 2].id === this.preview.activeCommand?.id) {
                    this.preview.toggleCommand(this.renderedEvents[count - 1]);
                }
            }
        }
    }
    
    getEventTime(event: any) {
        return event?.time?.started ?? event?.time?.created ?? event?.timestamp ?? event?.time;
    }
    
    packets() {
        let packets = [
            structuredClone(toJS(this.original)),
            ...this.commands,
            ...this.logs,
            ...this.screencasts,
            ...this.unspecific,
        ];
        
        for (let i = 1; i < packets.length; i++) {
            let packet = packets[i];
            packet.context = packets[0].context;
            // unset context because it is a circular dependency and also holds the websocket instance
            packets[i] = structuredClone(toJS(packet));
            // re-set the context on the original
            packet.context = this;
        }
        
        return packets;
    }
    
    blob() {
        return new Blob([encode(this.packets(), {extensionCodec: PUTH_EXTENSION_CODEC})]);
    }
    
    get took() {
        const ms = this.lastActivity - this.createdAt;
        const minutes = Math.floor(ms / 1000 / 60);
        const seconds = Math.ceil(ms / 1000 % 60);
        
        return {
            ms,
            minutes,
            seconds,
        };
    }
    
    get isForeground(): boolean {
        return this.app.activeContext?.id === this.id;
    }
}
