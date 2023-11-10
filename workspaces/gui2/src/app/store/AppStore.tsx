import {makeAutoObservable} from "mobx";
import Events from "../Events";
import {Connection} from "@/app/store/ConnectionStore.ts";
import PreviewStore from "@/app/store/PreviewStore.tsx";

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
    
    constructor() {
        makeAutoObservable(this);
    }
    
    public tryConnectingTo(host: string) {
        let connection = new Connection(host, new PreviewStore());
        this.connections.push(connection);
        this.active.connection = connection;
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
