import React from 'react';
import './Sidebar.scss';
import { Context } from '../Context/Context';
import { observer } from 'mobx-react-lite';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { Resizable } from 're-resizable';
import { useForceUpdatePreview } from '../../Misc/Util';
import { PreviewStore } from '../../../index';

const SidebarAction = observer(() => {
  let clear = () => {
    PreviewStore.clear();
    WebsocketHandler.clear();
  };

  return (
    <div className={'d-flex px-2 pt-2'}>
      <button className={'btn btn-sm btn-outline-primary'} onClick={clear}>
        Clear
      </button>
    </div>
  );
});

export default observer(function Sidebar() {
  const forceUpdatePreview = useForceUpdatePreview();

  return (
    <Resizable
      className={'d-flex flex-column pe-2'}
      defaultSize={{
        width: 550,
        height: '100%',
      }}
      minWidth={400}
      enable={{ right: true }}
      onResizeStop={forceUpdatePreview}
    >
      <SidebarAction />
      <div className={'sidebar p-2'}>
        {WebsocketHandler.contextArray.map((context, idx) => {
          return <Context key={context.id} context={context} />;
        })}
      </div>
    </Resizable>
  );
});
