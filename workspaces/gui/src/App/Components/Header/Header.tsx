import WebsocketHandler from '../../Misc/WebsocketHandler';
import { observer } from 'mobx-react-lite';
import puthLogoNew from '../../../assets/puth-logo-new.png';

export const Logo = ({ className = '' }) => (
  <div className={`logo ${className}`}>
    <div>PU</div>
    <div>TH</div>
  </div>
);

export default observer(function Header() {
  const status = (
    <div className="status" data-connected={WebsocketHandler.isConnected}>
      {WebsocketHandler.isConnected ? 'connected' : 'Disconneted'}
    </div>
  );

  return (
    <nav className="navbar navbar-expand navbar-dark bg-darker header">
      <div className="container-fluid">
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
            <a href="https://github.com/puth-io/puth" target={'_blank'} className="nav-link">
              Github
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
});
