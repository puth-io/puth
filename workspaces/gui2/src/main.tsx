import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import AppStore, {Connection} from "./app/store/AppStore.tsx";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// if (DevStore.connectAutomatically) {
//     WebsocketHandler.try(connectionSuggestions[0]);
// }

// dev code
// let test = new Connection('ws://127.0.0.1:7345/websocket');
// AppStore.connections.push(test);
// AppStore.active.connection = test;
