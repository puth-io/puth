import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {runInAction} from "mobx";
import DropzoneStore from "./app/store/DropzoneStore.tsx";
import {AppContext} from './shared/Contexts';
import AppStore from "@/app/store/AppStore";
import Events from "./app/Events.tsx";

const app = new AppStore();
if (process.env.NODE_ENV === 'development') {
    app.connectionSuggestions = ['ws://127.0.0.1:7345/websocket', ...app.connectionSuggestions];
}
Events.on('command:active', _ => {
    if (app.mode === 'follow') {
        app.mode = 'default';
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppContext.Provider value={{
            app: app,
        }}>
            <App/>
        </AppContext.Provider>
    </React.StrictMode>,
);

/**
 * Register drag and drop events
 */
let rootElement = document.getElementById('root');

rootElement?.addEventListener('dragenter', () => {
    runInAction(() => DropzoneStore.active++);
});
rootElement?.addEventListener('dragleave', () => {
    runInAction(() => DropzoneStore.active--);
});
rootElement?.addEventListener('drop', () => {
    runInAction(() => DropzoneStore.active--);
});


// if (DevStore.connectAutomatically) {
//     WebsocketHandler.try(connectionSuggestions[0]);
// }

// dev code
// let test = new Connection('ws://127.0.0.1:7345/websocket');
// AppStore.connections.push(test);
// AppStore.active.connection = test;
