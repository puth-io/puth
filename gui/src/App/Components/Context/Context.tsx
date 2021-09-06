import React, { FunctionComponent, useState } from 'react';
import './Context.scss';
import { Command, ICommand } from '../Command/Command';
import { observer } from 'mobx-react-lite';
import ContextStore from '../../Mobx/ContextStore';

type LogProps = {
  index: number;
  log: any;
};

const Log: FunctionComponent<LogProps> = ({ index, log }) => {
  let isError = log.messageType === 'error';
  let message =
    isError && log.args.length === 0
      ? log.text
      : log.args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');

  return (
    <tr className={'log'}>
      <td colSpan={6}>
        <div data-messagetype={log.messageType}>
          <div className="fst-italic small">console message (type: {log.messageType})</div>
          <div className={'small fw-bold'}>{message}</div>
          {isError && (
            <>
              <table className="small">
                <tbody>
                  {log.stackTrace.map((trace, idx) => (
                    <tr key={idx}>
                      <td>
                        {trace.lineNumber}
                        {trace.columnNumber && ':'}
                        {trace.columnNumber}
                      </td>
                      <td className={'text-danger'}>{trace.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

type ContextProps = {
  context: ContextStore;
};

export const Context: FunctionComponent<ContextProps> = observer(({ context }) => {
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => setExpanded(!expanded);
  const pointer = expanded ? '\u25BE' : '\u25B8';

  let events = context.renderedEvents;

  let commandIndex = 0;

  return (
    <div className={'context rounded-2'} data-context-id={context.id} data-status={context?.test?.status ?? undefined}>
      <div className={'d-flex align-items-center p-2 cursor-pointer lh-1 mb-1'} onClick={toggleExpand}>
        <div>{pointer}</div>
        <div className={'ms-2 flex-grow-1'}>
          <div className={'fw-bold'}>{context?.test?.name ?? 'Context'}</div>
          {context.group && <div className={' fw-light mt-1'}>{context.group}</div>}
        </div>
      </div>

      {expanded && (
        <table className={'table table-striped snapshots mx-2 mb-2'} cellSpacing={0} cellPadding={0}>
          <tbody>
            {events.map((event, idx) =>
              event.type === 'command' ? (
                <Command key={event.id} index={commandIndex++} command={event} />
              ) : (
                <Log key={event.id} index={idx} log={event} />
              ),
            )}
          </tbody>
        </table>
      )}

      <div className={'text-secondary fw-light text-end mb-1 me-2'}>{context.id}</div>
    </div>
  );
});
