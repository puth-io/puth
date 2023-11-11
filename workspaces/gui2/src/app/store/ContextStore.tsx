import {makeAutoObservable} from 'mobx';
import {ICommand} from '../Types';
import Constructors from 'puth/src/Context/Constructors';
import Events from "@/app/Events.tsx";

export default class ContextStore {
    id: string;
    
    commands: any[] = [];
    logs: any[] = [];
    screencasts: any[] = [];
    
    group: string = '';
    test: {
        name: string;
        status: undefined|'failed'|'success';
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
    
    createdAt: number;
    lastActivity: number;
    created: number = Date.now();
    
    constructor(
        id: string,
        options: {[key: string]: any},
        test: {name: string; status: 'failed'|'success'|undefined},
        group: string,
        capabilities: {[key: string]: boolean},
        createdAt: number,
    ) {
        this.id = id;
        this.options = options;
        this.test = test;
        this.group = group;
        this.capabilities = capabilities;
        this.createdAt = createdAt;
        this.lastActivity = createdAt;
        
        makeAutoObservable(this, {});
    }
    
    received(packet: any) {
        this.lastActivity = packet.timestamp;
        packet.context = this;
        
        if (packet.type === 'command') {
            this.commands.push(packet);
        } else if (packet.type === 'log') {
            this.logs.push(packet);
        } else if (packet.type === 'test') {
            if (packet.specific === 'status') {
                this.test.status = packet.status;
            }
        } else if (packet.type === 'update') {
            if (packet.specific === 'context.test') {
                this.test.status = packet.status;
            }
        } else if (packet.type === 'screencasts') {
            this.screencasts.push(packet);
            Events.emit('context:event:screencast', {context: this, packet});
            // this.emit('context:event:screencast', {context: this, packet});
            
            // TODO update
            // if (AppStore.mode === 'follow' && PreviewStore.activeContext === context) {
            //     PreviewStore.activeScreencast = packet;
            //     PreviewStore.timelineCursor = packet.timestamp;
            // }
        } else {
            console.log('unhandled event packet', packet);
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
}
