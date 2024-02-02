import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {runInAction} from "mobx";
import DropzoneStore from "./app/store/DropzoneStore.tsx";
import {AppContext} from './shared/Contexts';
import {AppStoreClass} from "./app/store/AppStore.tsx";
import Events from "./app/Events.tsx";

export const AppStore = new AppStoreClass();
if (process.env.NODE_ENV === 'development') {
    AppStore.connectionSuggestions = ['ws://127.0.0.1:7345/websocket', ...AppStore.connectionSuggestions];
}
Events.on('command:active', _ => {
    if (AppStore.mode === 'follow') {
        AppStore.mode = 'default';
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppContext.Provider value={{
            app: AppStore,
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
