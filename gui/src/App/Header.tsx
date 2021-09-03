import React from 'react';
import Logo from '../assets/puth-logo-white.png';
import { WebsocketHandler } from './WebsocketHandler';
import { observer } from 'mobx-react';

export default observer(function Header() {
  const status = (
    <div className="status" data-connected={WebsocketHandler.isConnected()}>
      {WebsocketHandler.isConnected() ? 'Connected to ' + WebsocketHandler.getUri() : 'Disconneted'}
    </div>
  );

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark">
      <div className="container-fluid">
        <div className="navbar-brand d-flex align-items-center">
          <img src={Logo} alt="" width="28" height="28" className="me-2" />
          Puth GUI
        </div>
        <ul className="navbar-nav">
          <li className="nav-item">
            <div className="nav-link">{status}</div>
          </li>
        </ul>
        <ul className="navbar-nav ms-auto">
          <li className="nav-item">
            <a href="https://puth.dev" className="nav-link">
              Puth
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
});
