import React from 'react';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { observer } from 'mobx-react-lite';
import './Header.scss';

export const Logo = ({ className = '' }) => (
  <div className={`logo ${className}`}>
    <div>PU</div>
    <div>TH</div>
  </div>
);

export default observer(function Header() {
  const status = (
    <div className="status" data-connected={WebsocketHandler.isConnected()}>
      {WebsocketHandler.isConnected() ? 'Connected to ' + WebsocketHandler.getUri() : 'Disconneted'}
    </div>
  );

  return (
    <nav className="navbar navbar-expand navbar-dark bg-darker header">
      <div className="container-fluid">
        <div className="d-flex align-items-center">
          <Logo className={'ml-auto me-2 align-self-center'} />
          <span className={'ms-1 fw-bold text-accent'}>Puth</span>
        </div>
        {/*<ul className="navbar-nav">
          <li className="nav-item">
            <div className="nav-link">{status}</div>
          </li>
        </ul>*/}
        <ul className="navbar-nav ms-auto">
          <li className="nav-item">
            <a href="https://pptr.dev/" target={'_blank'} className="nav-link">
              pptr.dev
            </a>
          </li>
          <li className="nav-item">
            <a href="https://puth.dev/" target={'_blank'} className="nav-link">
              puth.dev
            </a>
          </li>
          <li className="nav-item">
            <a href="https://playground.puth.dev" target={'_blank'} className="nav-link">
              Playground
            </a>
          </li>
          <li className="nav-item">
            <a href="https://github.com/SEUH/puth" target={'_blank'} className="nav-link">
              Github
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
});
