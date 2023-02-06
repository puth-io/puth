import React from 'react';
import './Sidebar.scss';
import { Context } from '../Context/Context';
import { observer } from 'mobx-react-lite';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { Resizable } from 're-resizable';
import { Events, PreviewStore } from '../../../main';

const SidebarAction = observer(() => {
  let clear = () => {
    PreviewStore.clear();
    WebsocketHandler.clear();
  };

  return (
    <div className={'height-3 d-flex align-items-center px-2 pt-2 pb-2'}>
      <button className={'btn btn-sm btn-outline-primary'} onClick={clear}>
        Clear
      </button>
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
      <SidebarAction />
      <div className={'sidebar px-2'}>
        {WebsocketHandler.contextArray.map((context, idx) => {
          return <Context key={context.id} context={context} />;
        })}
      </div>
    </Resizable>
  );
});
