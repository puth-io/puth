import {makeAutoObservable} from 'mobx';
import {Connection} from '../../store/ConnectionStore.ts';
import ContextStore from '@/app/overwrites/store/ContextStore.tsx';
import PreviewStore from '../../store/PreviewStore.tsx';

export class AppStoreClass {
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
        preview: PreviewStore,
    } = {
        contexts: [],
        active: null,
        preview: new PreviewStore(),
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
        makeAutoObservable(this);
        
        this.settings.preview.darken = this.readLocalStorageBoolean('previewStore.darken');
    }
    
    public tryConnectingTo(host: string) {
        let connection = new Connection(host, new PreviewStore());
        this.connections.push(connection);
        this.active.connection = connection;
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
        if (this.view === 'instance') {
            return this.active.connection?.preview;
        }
        
        return this.dragAndDropped.preview;
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
