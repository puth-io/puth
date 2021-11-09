import React, { FunctionComponent, useState } from 'react';
import './Context.scss';
import { observer } from 'mobx-react-lite';
import ContextStore from '../../Mobx/ContextStore';
import Log from '../Log/Log';
import Command from '../Command/Command';
import Request from '../Request/Request';
import { PreviewStore } from '../../../index';

type ContextProps = {
  context: ContextStore;
};

export const Context: FunctionComponent<ContextProps> = observer(({ context }) => {
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => setExpanded(!expanded);
  const pointer = expanded ? '\u25BE' : '\u25B8';

  let events = context.renderedEvents;

  let commandIndex = 0;

  let active = context === PreviewStore.activeContext;

  return (
    <div
      className={`context rounded-3 ${active ? 'active' : ''}`}
      data-context-id={context.id}
      data-status={context?.test?.status ?? undefined}
    >
      <div className={'d-flex align-items-center p-2 cursor-pointer lh-1 mb-1'} onClick={toggleExpand}>
        <div>{pointer}</div>
        <div className={'ms-2 flex-grow-1'}>
          <div className={'fw-bold'}>{context?.test?.name ?? 'Context'}</div>
          {context.group && <div className={' fw-light mt-1'}>{context.group}</div>}
        </div>
      </div>

      {expanded && (
        <table className={'table snapshots mx-2 mb-2'} cellSpacing={0} cellPadding={0}>
          <tbody>
            {events.map((event, idx) => {
              if (event.type === 'command') {
                return <Command key={event.id} index={commandIndex++} command={event} />;
              } else if (event.type === 'log') {
                return <Log key={event.id} log={event} />;
              } else if (event.type === 'request') {
                return <Request key={event.id} request={event} />;
              } else {
                return 'No component found for type to display';
              }
            })}
          </tbody>
        </table>
      )}

      <div className={'fs-small fw-light text-secondary text-end mb-1 me-2'}>{context.id}</div>
    </div>
  );
});
