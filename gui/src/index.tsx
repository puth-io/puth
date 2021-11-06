import React from 'react';
import ReactDOM from 'react-dom';
import App from './App/App';
import { WebsocketHandler } from './App/Misc/WebsocketHandler';
import mitt from 'mitt';
import { runInAction } from 'mobx';
import DropzoneStore from './App/Mobx/DropzoneStore';
import { PreviewStoreClass } from './App/Components/Preview/PreviewStore';

/**
 * Debug setup
 */
export const DEBUG_ENABLED = process.env.NODE_ENV === 'development';
// tslint:disable-next-line:no-empty
export let DEBUG = (func) => {};

if (DEBUG_ENABLED) {
  DEBUG = (func) => func();
} else {
  // tslint:disable-next-line:no-empty
  console.debug = () => {};
}

/**
 * Global Objects initialization
 */
export const Events = mitt();
export const PreviewStore = new PreviewStoreClass();

DEBUG(() => {
  Events.on('*', (type, event) => {
    // tslint:disable-next-line:no-console
    console.log('[EventLogger]', type, event);
  });
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);

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
