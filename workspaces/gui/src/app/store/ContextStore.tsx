import {action, computed, makeObservable, observable, toJS} from 'mobx';
import {Constructors} from '@puth/core';
import {encode} from '@msgpack/msgpack';
import {Connection, PUTH_EXTENSION_CODEC} from './ConnectionStore';
import PreviewStore from '@/app/store/PreviewStore';
import AppStore from './AppStore.tsx';

export default class ContextStore {
    readonly id: string;
    
    commands: any[] = [];
    logs: any[] = [];
    network: any[] = [];
    annotations: any[] = [];
    handoffs: any[] = [];
    navigations: any[] = [];
    screencasts: any[] = [];
    unspecific: any[] = [];
    renderedEvents: any[] = [];
    private responseContentByPacketId = new Map<string, Uint8Array>();
    
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
            network: observable,
            annotations: observable,
            handoffs: observable,
            navigations: observable,
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
            isAgent: computed,
            isLive: computed,
            handoff: computed,
            toolCalls: computed,
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
        this.registerResponseContent(packet);
        
        if (packet.type === 'command') {
            this.commands.push(packet);
            
            if ([Constructors.Page, Constructors.ElementHandle, 'Browser'].includes(packet.on.type)) {
                this.pushRenderedPacket(packet);
            }
        } else if (packet.type === 'log') {
            this.logs.push(packet);
            this.pushRenderedPacket(packet);
        } else if (packet.type === 'request' || packet.type === 'response' || (packet.type === 'update' && packet.specific === 'request.failed')) {
            this.network.push(packet);
            // Requests are only shown once they finished or failed.
            if (packet.type !== 'request') {
                this.pushRenderedPacket(packet);
            }
        } else if (packet.type === 'annotation') {
            // Marks from agents: tool calls, drafts and commands they made for themselves.
            this.annotations.push(packet);
            this.pushRenderedPacket(packet);
        } else if (packet.type === 'navigation') {
            // Splits the steps into the pages they ran on.
            this.navigations.push(packet);
            this.pushRenderedPacket(packet);
        } else if (packet.type === 'handoff') {
            this.handoffs.push(packet);
            // Where the agent took over and handed back separates its steps from those of the test.
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
    
    /**
     * Network packets carry no timestamp, only the time they finished.
     */
    private static eventTime(packet: any): number {
        return packet.timestamp ?? packet.time?.finished ?? packet.time ?? 0;
    }
    
    private pushRenderedPacket(packet: any) {
        const time = ContextStore.eventTime(packet);
        const count = this.renderedEvents.length;
        if (count === 0 || ContextStore.eventTime(this.renderedEvents[count - 1]) <= time) {
            this.renderedEvents.push(packet);
        } else {
            let index = this.renderedEvents.findIndex(item => ContextStore.eventTime(item) > time);
            this.renderedEvents.splice(index, 0, packet);
        }
        
        // While the latest command is selected, a new command takes over the selection.
        if (packet.type === 'command' && this.isForeground && this.followIncoming && this.preview !== null) {
            const commands = this.renderedEvents.filter(event => event.type === 'command');
            const count = commands.length;
            if (count > 1 && commands[count - 2].id === this.preview.activeCommand?.id) {
                this.preview.toggleCommand(commands[count - 1]);
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
            ...this.network,
            ...this.annotations,
            ...this.handoffs,
            ...this.navigations,
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

    /**
     * Resolves a deduplicated response body without expanding it in the stored
     * packet. Keeping the packet as a reference preserves compact exports.
     */
    responseContent(packet: {id: string, content?: Uint8Array, contentReference?: string}): Uint8Array|undefined {
        return packet.content ?? (packet.contentReference == null
            ? undefined
            : this.responseContentByPacketId.get(packet.contentReference));
    }

    private registerResponseContent(packet: any): void {
        if (packet.type !== 'response') {
            return;
        }

        if (packet.content instanceof Uint8Array) {
            this.responseContentByPacketId.set(packet.id, packet.content);
            return;
        }

        if (packet.contentReference != null && ! this.responseContentByPacketId.has(packet.contentReference)) {
            console.warn('Response content reference could not be resolved', packet);
        }
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
    
    /**
     * Sessions of the MCP server, which agents open to explore an application.
     */
    get isAgent(): boolean {
        return this.group === 'mcp';
    }
    
    get isLive(): boolean {
        return (this.test.status ?? 'pending') === 'pending';
    }
    
    /**
     * Where a handoff of this test stands: waiting for an agent, claimed by one, or ended.
     */
    get handoff(): {state: 'waiting'|'claimed'|'ended', name: string, reason?: string}|undefined {
        return this.handoffs[this.handoffs.length - 1];
    }
    
    get toolCalls(): number {
        return this.annotations.filter(annotation => annotation.kind === 'tool').length;
    }
    
    get isForeground(): boolean {
        return this.app.activeContext?.id === this.id;
    }
}
