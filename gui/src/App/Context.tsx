import React, { FunctionComponent, useState } from 'react';
import './Context.scss';
import { Command, ICommand } from './Command';
import { IContext } from './WebsocketHandler';
import { observer } from 'mobx-react';

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
      <td colSpan={5}>
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
  context: IContext;
};

export const Context: FunctionComponent<ContextProps> = observer(({ context }) => {
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => setExpanded(!expanded);
  const pointer = expanded ? '\u25BE' : '\u25B8';

  let typeFilter = (command: ICommand) => {
    return ['Page', 'ElementHandle'].includes(command.on.type);
  };

  let events = [...context.commands.filter(typeFilter), ...context.logs];

  events = events.sort((a, b) => {
    let aTime = a.type === 'log' ? a.time : a.time.started;
    let bTime = b.type === 'log' ? b.time : b.time.started;

    return aTime - bTime;
  });

  let commandIndex = 0;

  return (
    <div className={'context rounded-2'} data-context-id={context.id}>
      <div className={'d-flex align-items-center p-2 cursor-pointer'} onClick={toggleExpand}>
        <div>{pointer}</div>
        <div className={'fw-bold flex-grow-1 ms-2'}>Context</div>
        <div className={'text-secondary fw-light'}>{context.id}</div>
      </div>

      {expanded && (
        <table className={'table table-striped snapshots mx-2 mb-2'} cellSpacing={0} cellPadding={0}>
          <tbody>
            {events.map((event, idx) =>
              event.type === 'command' ? (
                <Command key={idx} index={commandIndex++} command={event} />
              ) : (
                <Log key={idx} index={idx} log={event} />
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
});
