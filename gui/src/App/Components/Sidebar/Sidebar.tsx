import React from 'react';
import './Sidebar.scss';
import { Context } from '../Context/Context';
import { observer } from 'mobx-react-lite';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { Resizable } from 're-resizable';
import { useForceUpdatePreview } from '../../Misc/Util';

export default observer(function Sidebar() {
  const forceUpdatePreview = useForceUpdatePreview();

  return (
    <Resizable
      className={'d-flex pe-2'}
      defaultSize={{
        width: 630,
        height: '100%',
      }}
      minWidth={500}
      enable={{ right: true }}
      onResizeStop={forceUpdatePreview}
    >
      <div className={'sidebar p-2'}>
        {WebsocketHandler.contextArray
          // .sort((c1, c2) => c2.created - c1.created)
          .map((context, idx) => {
            return <Context key={context.id} context={context} />;
          })}
      </div>
    </Resizable>
  );
});
