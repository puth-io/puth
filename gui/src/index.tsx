import React from 'react';
import ReactDOM from 'react-dom';
import App from './App/App';
import {WebsocketHandler} from './App/WebsocketHandler';
import mitt from 'mitt';

export const Events = mitt();

Events.on('*', (type, event) => {
    console.log('[EventLogger]', type, event);
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

WebsocketHandler.connect();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();