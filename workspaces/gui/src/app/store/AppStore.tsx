import {action, computed, makeObservable, observable} from 'mobx';
import {Connection} from './ConnectionStore';
import PreviewStore from '@/app/store/PreviewStore';
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
    
    view: 'local'|'instance' = 'instance';
    
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
            return this.active.connection?.contexts ?? [];
        }
        
        return this.dragAndDropped.contexts;
    }
    
    get activeContext() {
        if (this.view === 'instance') {
            return this.active.connection?.active.context;
        }
        
        return this.dragAndDropped.active;
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
        if (this.view === 'instance') {
            if (! this.active.connection) {
                return;
            }
            if (this.active.connection.active.context === context) {
                return;
            }
            
            this.active.connection.active.context = context;
            return;
        }
        
        this.dragAndDropped.active = context;
    }
    
    setView(view: 'local'|'instance') {
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
