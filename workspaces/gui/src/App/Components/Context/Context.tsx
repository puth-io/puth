import React, { FunctionComponent, MouseEvent, useState } from 'react';
import './Context.scss';
import { observer } from 'mobx-react-lite';
import ContextStore from '../../Mobx/ContextStore';
import Log from '../Log/Log';
import Command from '../Command/Command';
import Request from '../Request/Request';
import { PreviewStore } from '../../../main';

type ContextProps = {
  context: ContextStore;
};

export const Context: FunctionComponent<ContextProps> = observer(({ context }) => {
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => setExpanded(!expanded);
  const pointer = expanded ? '\u25BE' : '\u25C2';

  const [showLogs, setShowLogs] = useState(false);
  const [showXHR, setShowXHR] = useState(false);
  const [showTimings, setShowTimings] = useState(false);

  let events = context.renderedEvents;

  let filters: any = [];

  if (!showLogs) {
    filters.push('log');
  }

  if (!showXHR) {
    filters.push('request');
  }

  if (filters.length > 0) {
    events = events.filter((event: any) => !filters.includes(event.type));
  }

  let commandIndex = 0;

  // @ts-ignore
  let active = context === PreviewStore.activeContext;

  let logsToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowLogs(!showLogs);
  };

  let xhrToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowXHR(!showXHR);
  };

  let timingsToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowTimings(!showTimings);
  };

  return (
    <div
      className={`context rounded-2 ${active ? 'active' : ''}`}
      data-context-id={context.id}
      data-status={context?.test?.status ?? undefined}
    >
      <div className={'d-flex align-items-center px-2 py-1 cursor-pointer lh-1 mb-1'} onClick={toggleExpand}>
        <div className={'flex-grow-1 overflow-hidden min-w-0 pe-1'}>
          <div className={'fw-bold text-ellipsis'}>{context?.test?.name ?? 'Context'}</div>
          {context.group && <div className={'fw-light fs-small mt-1 text-ellipsis'}>{context.group}</div>}
        </div>
        <button
          className={`btn btn-smaller btn-outline-primary ${showXHR && 'active'} py-05 text-nowrap`}
          onClick={xhrToggle}
        >
          {showXHR && <span>&#10003;</span>} <span>XHR</span>
        </button>
        <button
          className={`btn btn-smaller btn-outline-primary ${showLogs && 'active'} py-05 text-nowrap`}
          onClick={logsToggle}
        >
          {showLogs && <span>&#10003;</span>} <span>Logs</span>
        </button>
        <button
          className={`btn btn-smaller btn-outline-primary ${showTimings && 'active'} py-05 text-nowrap`}
          onClick={timingsToggle}
        >
          {showTimings && <span>&#10003;</span>} <span>Time</span>
        </button>
        <div>{pointer}</div>
      </div>

      {expanded && (
        <table className={'table snapshots mx-2 mb-2'} cellSpacing={0} cellPadding={0}>
          <tbody>
            {events.map((event: any, idx) => {
              if (event.type === 'command') {
                return <Command key={event.id} index={commandIndex++} command={event} showTimings={showTimings} />;
              } else if (event.type === 'log') {
                return <Log key={event.id} log={event} />;
              } else if (event.type === 'request') {
                return <Request key={event.id} request={event} />;
              } else {
                return <tr>No component found for type to display</tr>;
              }
            })}
          </tbody>
        </table>
      )}
    </div>
  );
});
