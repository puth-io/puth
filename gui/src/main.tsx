import React from 'react';
import { createRoot } from 'react-dom/client';
import mitt from 'mitt';
import { DebugClass } from './App/Misc/Debug';
import { WebsocketHandler } from './App/Misc/WebsocketHandler';
import { runInAction } from 'mobx';
import DropzoneStore from './App/Mobx/DropzoneStore';
import { PreviewStoreClass } from './App/Mobx/PreviewStore';
import App from './App/App';

/**
 * Pre global objects initialization (required for debug handler)
 */
export const Events = mitt();

/**
 * Debug setup
 */
export const DebugStore = new DebugClass();

/**
 * Global objects initialization
 */
export const PreviewStore = new PreviewStoreClass();

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/**
 * Websocket initialization
 */
let websocketFirstTryHost = 'ws://' + window.location.host + '/websocket';

// Gets removed in production code by webpack
if (process.env.NODE_ENV === 'development') {
  websocketFirstTryHost = 'ws://127.0.0.1:4000/websocket';
}

// Try to connect to websocket on same hostname like gui.
WebsocketHandler.try(websocketFirstTryHost);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log);

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
