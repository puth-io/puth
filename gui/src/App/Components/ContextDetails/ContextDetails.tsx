import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useForceUpdatePreview } from '../../Misc/Util';
import { Events, PreviewStore } from '../../../main';
import { Resizable } from 're-resizable';
import { Exception } from '../Preview/Preview';

const ExceptionsTab = ({ exceptions, contextId }) => {
  return exceptions.map((exception, idx) => <Exception key={`${contextId}-${idx}`} exception={exception} />);
};

export const ContextDetails = observer(() => {
  const [activeTab, setActiveTab] = useState('exceptions');
  const forceUpdatePreview = useForceUpdatePreview();

  let context = PreviewStore.activeContext;

  let shortened = 23;

  let onResizeStop = useCallback(
    (event, direction, element, diff) => {
      store.height = element.offsetHeight;
      Events.emit('layout:resize');
    },
    [context],
  );

  // useEffect(() => {
  //   console.log(ref.current);
  //
  //   let commandActiveHandler = (cmd) => {
  //     console.log(cmd, ref, ref.current, ref?.current?.style);
  //
  //     if (!ref.current) {
  //       return;
  //     }
  //
  //     if (cmd && cmd.context.hasDetails) {
  //       ref.current.style.height = `${store.height}px`;
  //     } else {
  //       ref.current.style.height = `${shortened}px`;
  //     }
  //
  //     console.log(ref.current.style.height);
  //   };
  //
  //   Events.on('command:active', commandActiveHandler);
  //
  //   return () => {
  //     Events.off('command:active', commandActiveHandler);
  //   };
  // }, [ref.current]);

  if (!context) {
    return <></>;
  }

  let hasExceptions = context.exceptions.length > 0;

  let tabsEnabled = hasExceptions;

  let isActive = (test: string | undefined) => activeTab === test;

  return (
    <Resizable
      className={'d-flex flex-column border-left border-default bg-dark-5'}
      defaultSize={{
        height: context.hasDetails ? store.height : shortened,
        width: '100%',
      }}
      minHeight={shortened}
      enable={{ top: true }}
      onResizeStop={onResizeStop}
    >
      <div className={'footer'}>
        <div className={'tab-menu'}>
          {hasExceptions && (
            <div className={'tab-button active'} onClick={(_) => setActiveTab('exceptions')}>
              Exceptions
            </div>
          )}
        </div>
        <div className={'ml-auto'}>{context && `Context: ${context?.id}`}</div>
      </div>
      {tabsEnabled && (
        <div className={'d-flex flex-column border-default tab-content min-h-0'}>
          {isActive('exceptions') && <ExceptionsTab exceptions={context.exceptions} contextId={context.id} />}
        </div>
      )}
    </Resizable>
  );
});

const store = observable({
  height: 300,
});
