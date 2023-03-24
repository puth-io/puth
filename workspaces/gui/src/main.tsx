import React from 'react';
import { createRoot } from 'react-dom/client';
import { runInAction } from 'mobx';
import DropzoneStore from './App/Mobx/DropzoneStore';
import App from './App/App';
import './index.css';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
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
