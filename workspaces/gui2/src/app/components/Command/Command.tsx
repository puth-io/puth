import {FunctionComponent, useCallback, useContext} from 'react';
import './Command.scss';
import Events from '../../Events';
import { ICommand } from '../../Types';
import { observer } from 'mobx-react-lite';
import Constructors from 'puth/src/Context/Constructors';
import {AppContext} from '../../../shared/Contexts';
import {Icon} from "@/components/icon.tsx";
import {StatusIcon} from "../Context.tsx";

type CommandProps = {
  index: number | undefined;
  command: ICommand;
  showTimings: boolean;
};

const Command: FunctionComponent<CommandProps> = observer(({ index, command, showTimings = false }) => {
  const {app} = useContext(AppContext);
  let { on, func, args } = command;

  let mouseClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      Events.emit('preview:toggle', command);
    },
    [command],
  );
  let mouseEnter = useCallback(() => Events.emit('preview:highlight:show', command), [command]);
  let mouseLeave = useCallback(() => Events.emit('preview:highlight:hide', command), [command]);

  let displayType: any = on.type;
  if (on.type === Constructors.ElementHandle) {
    displayType = 'Element';
  } else if (on.type === Constructors.Page) {
    displayType = 'Page';
  } else if (on.type === Constructors.Browser) {
    displayType = 'Browser';
  }

  let displayArgs = args.map((arg) => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return arg;
  });

  /**
   * TODO need better solution for displaying long function names
   */
  let displayFunc = '';
  if (func.length > 10) {
    let indices = [0];

    for (let i = 1; i < func.length; i++) {
      let char = func[i];
      if (char === char.toUpperCase()) {
        indices.push(i);
      }
    }

    if (indices.length <= 10) {
      let suffix = Math.floor(10 / indices.length);
      indices.forEach((indic) => {
        displayFunc += func.slice(indic, indic + (suffix > 1 ? suffix : 1));
      });
    }
  } else {
    displayFunc = func;
  }

  let active = app.preview?.activeCommand?.id === command?.id;
  let hasErrors = command.errors.length > 0;

  let {inBetween, replayTime, minReplayTime, maxReplayTime} = app.preview?.screencast;
  let replayProgress =  <></>;
  if (active && app.preview?.screencast.mode === 'replay' && inBetween.length > 2) {
    let timespan = maxReplayTime - minReplayTime;
    let progress = replayTime - minReplayTime;
    let percent = progress / timespan;
    replayProgress = <div className={'bg-primary'} style={{zIndex: 10, height: '2px', position: 'absolute', bottom: '2px', left: '0px', width: Math.min(percent * 100, 100) + '%'}}></div>;
  }
  
  let statusIcon = hasErrors ? <StatusIcon status={'failed'}/> : null;
  let statusBackground = hasErrors ? 'bg-task-error' : 'bg-task';
  let status = <div className={`absolute left-0 ${statusBackground}`} style={{top: '2px', bottom: '2px', width: '3px',}}/>
  
  return (
    <>
      <tr
        className={`command step relative ${active ? 'active' : ''}`}
        onClick={mouseClick}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
      >
        <td
            className={`py-2 pl-4`}
            style={{paddingLeft: '0.75rem'}}
        >
          {index !== undefined ? index + 1 : ''}
          {replayProgress}
          {status}
        </td>
        <td>
          {showTimings && (
            <>
              {(command.time.elapsed / 1000).toFixed(1)}s
              {command?.time?.took !== 0 && command?.time?.took && command.time.took > 250 && (
                <div>
                  <span className={'text-warning-dark'}>{(command.time.took / 1000).toFixed(1)}s</span>
                </div>
              )}
            </>
          )}
        </td>
        <td>{displayType}</td>
        <td>{displayFunc}</td>
        <td className={''} colSpan={statusIcon ? 1 : 2}>{displayArgs.join(', ')}</td>
        {statusIcon && (
            <td className={'leading-none pr-4'}>{statusIcon}</td>
        )}
      </tr>
      
      {command.errors.map((error: any, idx) => {
        let title = error.type === 'error' ? error.error.name : 'Expectation missed';
        let message = error.type === 'error' ? error.error.message : error.expectation.message;

        return (
          <tr
            key={idx}
          >
            <td colSpan={6} className={'relative p-0'}>
              <div style={{width: '1px', height: '1.75rem', background: 'rgba(255, 255, 255, 0.24)', position: 'absolute', left: '0.5rem', top: 0,}}/>
              <div style={{width: '0.75rem', height: '1px', background: 'rgba(255, 255, 255, 0.24)', position: 'absolute', left: '0.5rem', top: '1.75rem',}}/>
              <div className={'p-3 ml-6 rounded-md'} data-messagetype={'error'} style={{backgroundColor: 'rgba(212, 49, 49, 0.12)'}}>
                <div className={'text-xs text-red flex items-center'}><Icon name={'bolt'} className={'mr-1'}/> {title}</div>
                <div className={'text-xxs text-unselected mt-3'}>{message}</div>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
});

export default Command;
