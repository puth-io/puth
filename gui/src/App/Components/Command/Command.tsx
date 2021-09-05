import React, { FunctionComponent, useCallback } from 'react';
import './Command.scss';
import { Events } from '../../../index';
import { previewStore } from '../Preview/Preview';
import { ISnapshot } from '../../../../../src/server/src/Snapshots';
import { IContext } from '../../Misc/WebsocketHandler';
import { observer } from 'mobx-react-lite';

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
  snapshots: {
    before: ISnapshot | undefined;
    after: ISnapshot | undefined;
  };
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
};

export const Command: FunctionComponent<CommandProps> = observer(({ index, command }) => {
  let { on, func, args } = command;

  let mouseClick = useCallback(
    (e) => {
      e.stopPropagation();
      Events.emit('preview:toggle', command);
    },
    [command],
  );
  let mouseEnter = useCallback(() => Events.emit('preview:highlight:show', command), [command]);
  let mouseLeave = useCallback(() => Events.emit('preview:highlight:hide', command), [command]);

  let displayType: any = on.type;
  if (on.type === 'ElementHandle') {
    displayType = 'Element';
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
  let active = previewStore.activeCommand?.id === command?.id;
  let hasErrors = command.errors.length > 0;

  return (
    <>
      <tr
        className={`command ${active ? 'active' : ''} ${hasErrors ? 'hasErrors' : ''}`}
        onClick={mouseClick}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
      >
        <td>{index !== undefined ? index + 1 : ''}</td>
        <td>
          {(command.time.elapsed / 1000).toFixed(1)}s
          {command.time?.took > 250 && (
            <span className={'ms-1 text-warning'}>({(command.time?.took / 1000).toFixed(1)}s)</span>
          )}
        </td>
        <td>{displayType}</td>

        <td>{displayFunc}</td>
        <td colSpan={active ? 1 : 2}>{displayArgs.join(', ')}</td>
        {active && <td>{circleDot}</td>}
      </tr>

      {command.errors.map((error: any, idx) => {
        let message = error.type === 'error' ? error.error.message : error.expectation.message;

        return (
          <tr
            key={idx}
            className={`log ${active ? 'active' : ''}`}
            onClick={mouseClick}
            onMouseEnter={mouseEnter}
            onMouseLeave={mouseLeave}
          >
            <td colSpan={6}>
              <div data-messagetype={'error'}>
                <div className={'title'}>Error</div>
                <div className={'message'}>{message}</div>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
});
