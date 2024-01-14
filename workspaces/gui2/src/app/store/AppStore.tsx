import {makeAutoObservable} from "mobx";
import Events from "../Events";
import {Connection} from "@/app/store/ConnectionStore.ts";
import PreviewStore from "@/app/store/PreviewStore.tsx";
import ContextStore from "@/app/store/ContextStore.tsx";

class AppStoreClass {
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
    
    view: 'local'|'instance' = 'local';
    
    constructor() {
        makeAutoObservable(this);
    }
    
    public tryConnectingTo(host: string) {
        let connection = new Connection(host, new PreviewStore());
        this.connections.push(connection);
        this.active.connection = connection;
    }
    
    get history() {
        if (this.view === 'instance') {
            return this.active.connection?.contexts;
        }
        
        return this.dragAndDropped.contexts;
    }
    
    get activeContext() {
        if (this.view === 'instance') {
            return this.active.connection?.active.context;
        }
        
        return this.dragAndDropped.active;
    }
    
    get preview() {
        if (this.view === 'instance') {
            return this.active.connection?.preview;
        }
        
        return this.dragAndDropped.preview;
    }
    
    get empty() {
        return (this.dragAndDropped.contexts.length + this.connections.length) === 0;
    }
    
    setActive(context: ContextStore) {
        if (this.view === 'instance') {
            if (!this.active.connection) {
                return;
            }
            
            this.active.connection.active.context = context;
        }
        
        this.dragAndDropped.active = context;
    }
}

const AppStore = new AppStoreClass();
export default AppStore;

if (process.env.NODE_ENV === 'development') {
    AppStore.connectionSuggestions = ['ws://127.0.0.1:7345/websocket', ...AppStore.connectionSuggestions];
}

Events.on('command:active', _ => {
    if (AppStore.mode === 'follow') {
        AppStore.mode = 'default';
    }
});
