import React from 'react';
import './Sidebar.scss';
import { Context } from '../Context/Context';
import { observer } from 'mobx-react-lite';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { Resizable } from 're-resizable';
import { Events, PreviewStore } from '../../../main';
import puthLogoNew from '../../../assets/puth-logo-new.png';

const SidebarAction = observer(() => {
  let clear = () => {
    PreviewStore.clear();
    WebsocketHandler.clear();
  };

  return (
    <div className={'height-3 d-flex align-items-center ps-2 pt-2 pb-2'}>
      {!WebsocketHandler.hasNoContexts && (
        <button className={'btn btn-sm btn-outline-primary'} onClick={clear}>
          Clear
        </button>
      )}
    </div>
  );
});

export default observer(function Sidebar() {
  return (
    <Resizable
      className={'d-flex flex-column pe-2'}
      defaultSize={{
        width: 550,
        height: '100%',
      }}
      minWidth={400}
      enable={{ right: true }}
      onResizeStop={() => Events.emit('layout:resize')}
    >
      <div className="d-flex align-items-center">
        <div className="d-flex align-items-center ms-2 me-auto">
          <img src={puthLogoNew} className={'align-self-center'} style={{ height: '18px' }} alt="" />
          <span className={'ms-2 text-accent'} style={{ fontSize: '1.2rem' }}>
            Puth
          </span>
        </div>
        <SidebarAction />
      </div>
      <div className={'sidebar px-2'}>
        {WebsocketHandler.contextArray.map((context, idx) => {
          return <Context key={context.id} context={context} />;
        })}
      </div>
    </Resizable>
  );
});
