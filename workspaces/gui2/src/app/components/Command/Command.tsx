import {FunctionComponent, useCallback, useContext} from 'react';
import './Command.scss';
import Events from '../../Events';
import { IContext } from '../../Types';
import { observer } from 'mobx-react-lite';
import Constructors from 'puth/src/Context/Constructors';
import {AppContext} from "@/App.tsx";

export type IViewport = {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscaped: boolean;
};

export type ICommand = {
  id: string;
  type: 'command';
  errors: [];
  context: IContext;
  func: string;
  args: string[];
  on: {
    type: string;
    path: [[string, number][] | string][];
  };
  time: {
    started: number;
    elapsed: number;
    took?: number;
    finished?: number;
  };
};

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

  const circleDot = '\u2299';
  let active = app.active.connection?.preview.activeCommand?.id === command?.id;
  let hasErrors = command.errors.length > 0;

  return (
    <>
      <tr
        className={`command ${active ? 'active' : ''} ${hasErrors ? 'bg-red-500' : ''} relative`}
        onClick={mouseClick}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
      >
        <td>{index !== undefined ? index + 1 : ''}</td>
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
        <td colSpan={2}>{displayArgs.join(', ')}</td>
      </tr>

      {command.errors.map((error: any, idx) => {
        let message = error.type === 'error' ? error.error.message : error.expectation.message;

        return (
          <tr
            key={idx}
            className={`border-l-4 border-l-red log ${active ? 'active' : ''}`}
            onClick={mouseClick}
            onMouseEnter={mouseEnter}
            onMouseLeave={mouseLeave}
          >
            <td colSpan={6}>
              <div data-messagetype={'error'}>
                <div className={'font-bold text-red'}>{error.error.name}</div>
                <div className={''}>{message}</div>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
});

export default Command;
