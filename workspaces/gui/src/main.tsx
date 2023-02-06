import React from 'react';
import { createRoot } from 'react-dom/client';
import mitt from 'mitt';
import { WebsocketHandler } from './App/Misc/WebsocketHandler';
import { runInAction } from 'mobx';
import DropzoneStore from './App/Mobx/DropzoneStore';
import { PreviewStoreClass } from './App/Mobx/PreviewStore';
import { DevStoreClass } from './App/Misc/DebugStoreClass';
import App from './App/App';
import './index.css';

/**
 * Pre global objects initialization (required for debug handler)
 */
export const Events = mitt();

/**
 * Debug setup
 */
export const DevStore = new DevStoreClass();

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
 * Websocket auto connect
 */
if (DevStore.connectAutomatically) {
  WebsocketHandler.try(WebsocketHandler.connectionSuggestions[0]);
}

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
