import {action, computed, makeObservable, observable} from 'mobx';
import {Connection} from './ConnectionStore';
import ContextStore from '@/app/store/ContextStore';

export default class AppStore {
    name: {suffix: string} = {
        suffix: '',
    };
    connections: Connection[] = [];
    connectionSuggestions: string[] = [
        (document.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/websocket',
    ];
    active: {
        connection?: Connection,
    } = {
        connection: undefined,
    };
    modals: {
        connectionViewer: boolean,
    } = {
        connectionViewer: true,
    };
    mode: 'default'|'follow' = 'default';
    classes = {
        Connection: Connection,
    };
    
    dragAndDropped: {
        contexts: ContextStore[],
        active: ContextStore|null,
    } = {
        contexts: [],
        active: null,
    };
    
    settings: {
        preview: {
            darken: boolean,
        },
    } = {
        preview: {
            darken: false,
        },
    };
    
    view: 'local'|'instance'|'agents' = 'instance';
    
    agentsActive: ContextStore|null = null;
    // Pinned agent sessions stay listed after they closed.
    pinned: string[] = [];
    
    importErrors: string[] = [];
    
    constructor() {
        this.settings.preview.darken = this.readLocalStorageBoolean('previewStore.darken');
        
        makeObservable(this, {
            name: observable,
            connections: observable,
            connectionSuggestions: observable,
            active: observable,
            modals: observable,
            mode: observable,
            classes: observable,
            dragAndDropped: observable,
            settings: observable,
            view: observable,
            agentsActive: observable,
            pinned: observable,
            togglePinned: action,
            agents: computed,
            liveAgents: computed,
            importErrors: observable,
            
            tryConnectingTo: action,
            setActive: action,
            setView: action,
            setDarkenPreview: action,
            
            history: computed,
            activeContext: computed,
            previewStore: computed,
            empty: computed,
            hasLocalContexts: computed,
            isConnected: computed,
        });
    }
    
    public async tryConnectingTo(host: string) {
        return (new Connection(this))
            .connect(host)
            .then(connection => {
                // TODO handling in a better way for pro version
                if (this.connections.length !== 0) {
                    this.connections[0].destroy();
                    this.connections = [];
                }
                
                this.connections.push(connection);
                this.active.connection = connection;
                
                return connection;
            });
    }
    
    get history() {
        if (this.view === 'instance') {
            return (this.active.connection?.contexts ?? []).filter(context => ! context.isAgent);
        }
        if (this.view === 'agents') {
            return this.agents;
        }
        
        return this.dragAndDropped.contexts;
    }
    
    /**
     * Agent sessions, and tests an agent took over with a handoff, which hold what the agent did.
     */
    get agents(): ContextStore[] {
        return (this.active.connection?.contexts ?? [])
            .filter(context => context.isAgent || context.handoffs.some(handoff => handoff.state === 'claimed'));
    }
    
    get liveAgents(): number {
        return this.agents.filter(context => context.isLive).length;
    }
    
    get activeContext() {
        if (this.view === 'instance') {
            return this.active.connection?.active.context;
        }
        if (this.view === 'agents') {
            return this.agentsActive ?? undefined;
        }
        
        return this.dragAndDropped.active;
    }
    
    togglePinned(context: ContextStore) {
        this.pinned = this.pinned.includes(context.id)
            ? this.pinned.filter(id => id !== context.id)
            : [...this.pinned, context.id];
    }
    
    get previewStore() {
        return this.activeContext?.preview;
    }
    
    get empty() {
        return ! this.hasLocalContexts && ! this.isConnected;
    }
    
    get hasLocalContexts() {
        return this.dragAndDropped.contexts.length !== 0;
    }
    
    get isConnected() {
        return this.connections.length !== 0;
    }
    
    setActive(context: ContextStore) {
        if (this.view === 'agents') {
            this.agentsActive = context;
            return;
        }
        if (this.view === 'instance') {
            if (! this.active.connection) {
                return;
            }
            if (this.active.connection.active.context === context) {
                return;
            }
            
            this.active.connection.setActiveContext(context);
            return;
        }
        
        this.dragAndDropped.active = context;
    }
    
    setView(view: 'local'|'instance'|'agents') {
        this.view = view;
    }
    
    setDarkenPreview(value: boolean) {
        this.settings.preview.darken = value;
        this.writeLocalStorageBoolean('previewStore.darken', value);
    }
    
    readLocalStorageBoolean(key: string) {
        return localStorage.getItem(key) === 'true';
    }
    
    writeLocalStorageBoolean(key: string, value: boolean) {
        localStorage.setItem(key, value ? 'true' : 'false');
    }
}
