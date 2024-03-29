import {action, computed, makeObservable, observable, toJS} from 'mobx';
import Constructors from 'puth/src/context/Constructors';
import {encode} from "@msgpack/msgpack";
import {ICommand} from "../Types";
import Events from "../Events";
import {PUTH_EXTENSION_CODEC} from "./ConnectionStore";

export default class ContextStore {
    readonly id: string;
    
    commands: any[] = [];
    logs: any[] = [];
    screencasts: any[] = [];
    unspecific: any[] = [];
    
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
    readonly created: number = Date.now();
    lastActivity: number;
    
    readonly original: any;
    connectionStore: any;
    
    constructor(
        packet: any,
        connectionStore?: any,
    ) {
        this.original = packet;
        this.connectionStore = connectionStore;
        
        let {id, options, test, group, capabilities, timestamp} = packet;
        this.id = id;
        this.options = options;
        this.test = test;
        this.group = group;
        this.capabilities = capabilities;
        this.createdAt = timestamp;
        this.lastActivity = timestamp;
        
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
            connectionStore: observable,
            
            received: action,
            getRenderedTypesFilter: action,
            getEventTime: action,
            packets: action,
            blob: action,
            
            renderedEvents: computed,
            took: computed,
        });
    }
    
    received(packet: any) {
        packet.context = this;
        
        let last = packet?.time?.finished > packet.timestamp ? packet.time.finished : packet.timestamp;
        if (last > this.lastActivity) {
            this.lastActivity = last;
        }
        
        if (packet.type === 'command') {
            this.commands.push(packet);
        } else if (packet.type === 'log') {
            this.logs.push(packet);
        } else if (packet.type === 'test') {
            if (packet.specific === 'status') {
                this.test.status = packet.status;
            }
            this.unspecific.push(packet);
        } else if (packet.type === 'screencasts') {
            this.screencasts.push(packet);
            Events.emit('context:event:screencast', {context: this as TODO, packet});
            // this.emit('context:event:screencast', {context: this, packet});
            
            // TODO update
            // if (AppStore.mode === 'follow' && PreviewStore.activeContext === context) {
            //     PreviewStore.activeScreencast = packet;
            //     PreviewStore.timelineCursor = packet.timestamp;
            // }
        } else {
            console.log('unhandled event packet', packet);
            this.unspecific.push(packet);
        }
    }
    
    getRenderedTypesFilter() {
        return (command: ICommand) => {
            return [Constructors.Page, Constructors.ElementHandle].includes(command.on.type);
        };
    }
    
    get renderedEvents() {
        return [
            ...this.commands.filter(this.getRenderedTypesFilter()),
            ...this.logs,
            ...this.screencasts,
        ].sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
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
}
