import React from 'react';
import './Sidebar.scss';
import { Context } from './Context';
import { observer } from 'mobx-react';
import { WebsocketHandler } from './WebsocketHandler';


export default observer(function Sidebar() {
  return (
    <div className='sidebar overflow-auto p-2'>
      {Array.from(WebsocketHandler.getContexts().values()).sort((c1, c2) => c2.created - c1.created).map((context, idx) => {
        return (
          <Context
            key={idx}
            context={context}
          />
        );
      })}
    </div>
  );
});