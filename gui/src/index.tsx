import React from 'react';
import ReactDOM from 'react-dom';
import App from './App/App';
import { WebsocketHandler } from './App/Misc/WebsocketHandler';
import mitt from 'mitt';
import { runInAction } from 'mobx';
import DropzoneStore from './App/Mobx/DropzoneStore';
import { PreviewStoreClass } from './App/Mobx/PreviewStore';
import { DebugClass } from './App/Misc/Debug';

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

/**
 * Main render function
 */
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
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
let root = document.getElementById('root');

root.addEventListener('dragenter', () => {
  runInAction(() => DropzoneStore.active++);
});
root.addEventListener('dragleave', () => {
  runInAction(() => DropzoneStore.active--);
});
root.addEventListener('drop', () => {
  runInAction(() => DropzoneStore.active--);
});
