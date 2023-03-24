// @ts-nocheck
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { calculateIframeSize, debounce, useForceUpdatePreview } from '../../Misc/Util';
import './Preview.scss';
import { loadHighlights } from '../Highlight';
import DevStore from "../../Misc/DebugStoreClass";
import PreviewStore from "../../Mobx/PreviewStore";
import Events from "../../../Events";
import { recoverAfterRender } from '../../Misc/SnapshotRecovering';
import WebsocketHandler from '../../Misc/WebsocketHandler';
import Code from '../Code/Code';
import { ContextDetails } from '../ContextDetails/ContextDetails';

// @ts-ignore
const Tab = ({ title, subTitle = null, active = null, deletable = true }) => {
  return (
    <div className={'tab rounded-2' + (active ? ' active' : '')}>
      <div className={'d-flex'}>
        <div className={'title flex-grow-1'}>{title}</div>
        {deletable && <div className={'close'}>&times;</div>}
      </div>
      {subTitle && <div className={'subTitle'}>{subTitle}</div>}
    </div>
  );
};

const QuickNavigation = () => {
  return (
    <>
      <div className={'d-flex tabs align-items-stretch'}>
        {/* @ts-ignore */}
        <Tab title={'Follow'} subTitle={'Incoming'} deletable={false} active />
        {/*<Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} />
        <Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} />
        <Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} />*/}
      </div>
    </>
  );
};

const PreviewOverlay = observer(() => <div className={`overlay ${PreviewStore.darken ? 'darken' : ''}`}></div>);

export const Split = () => <span className={'split'}> | </span>;

const FooterMetrics = observer(() => {
  let { contexts, events } = WebsocketHandler.getMetrics();

  let bytesReceived = (WebsocketHandler.getTotalBytesReceived() / 1000 / 1000).toFixed(2);

  return (
    <div>
      {`${contexts} contexts`}
      <Split />
      {`${events} events`}
    </div>
  );
});

export const SPACE = <>&nbsp;</>;

export const Trace = ({ trace }) => (
  <Code code={trace?.map((frame) => frame.file + ':' + frame.line + '\n')} language={'log'} />
);

export const PreviewFooter = observer(() => {
  return (
    <div className={'footer border-left border-default z-10'}>
      <FooterMetrics />
      <div className={'ml-auto checkbox-container'}>
        <input
          type="checkbox"
          className="form-check-input me-1"
          id="remove-script-tags-checkbox"
          checked={PreviewStore.removeScriptTags}
          onChange={() => (PreviewStore.removeScriptTags = !PreviewStore.removeScriptTags)}
        />
        <label className="form-check-label" htmlFor="remove-script-tags-checkbox">
          Remove script tags
        </label>
      </div>
      <div className={'checkbox-container'}>
        <input
          type="checkbox"
          className="form-check-input me-1"
          id="darken-preview-checkbox"
          checked={PreviewStore.darken}
          onChange={() => (PreviewStore.darken = !PreviewStore.darken)}
        />
        <label className="form-check-label" htmlFor="darken-preview-checkbox">
          Darken preview
        </label>
      </div>
      <div className={'checkbox-container'}>
        <input
          type="checkbox"
          className="form-check-input me-1"
          id="connect-automatically-checkbox"
          checked={DevStore.connectAutomatically}
          onChange={() => (DevStore.connectAutomatically = !DevStore.connectAutomatically)}
        />
        <label className="form-check-label" htmlFor="connect-automatically-checkbox">
          Connect automatically
        </label>
      </div>
      <div className={'checkbox-container'}>
        <input
          type="checkbox"
          className="form-check-input me-1"
          id="debug-checkbox"
          checked={DevStore.debug}
          onChange={() => (DevStore.debug = !DevStore.debug)}
        />
        <label className="form-check-label" htmlFor="debug-checkbox">
          Debug
        </label>
      </div>
    </div>
  );
});

export const Preview = observer(() => {
  const forceUpdatePreview = useForceUpdatePreview(true);
  const iframeRef = useRef<any>(null);
  const iframeContainerRef = useRef(null);

  const handleResize = debounce(forceUpdatePreview);

  // Handle window resize because preview iframe should scale to the minimum available space.
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    Events.on('layout:resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Events.off('layout:resize', handleResize);
    };
  }, []);

  const stickSnapshotState = (state: 'before' | 'after') => {
    PreviewStore.activeState = state;
  };

  let snapshot = PreviewStore.visibleSnapshot;
  let iframe: any = iframeRef?.current;
  let iframeSize = calculateIframeSize(snapshot, iframeContainerRef);
  let html = PreviewStore.visibleSnapshotSource;

  if (iframe && html) {
    // Using a blob is faster than putting the src into 'srcdoc' and also faster than iframe.document.write
    // (which is also not the best to use). Creating a blob allows the browser to load the data into the
    // iframe in a usual way.
    iframe.src = html;
  } else if (iframe) {
    // cleans iframe
    iframe.src = '';
  }

  const PreviewInfo = observer(() => (
    <div className="d-flex flex-1 info me-2">
      <div className="btn-group btn-group-sm" role="group">
        <button
          type="button"
          className={`btn m-0 btn-outline-primary ${PreviewStore.visibleHighlightState === 'before' ? 'active' : ''}`}
          onClick={(_) => stickSnapshotState('before')}
          disabled={!PreviewStore.isVisibleHighlight && !PreviewStore.visibleHasBefore}
        >
          Before
        </button>
        <button
          type="button"
          className={`btn btn-outline-primary m-0 ${PreviewStore.visibleHighlightState === 'after' ? 'active' : ''}`}
          onClick={(_) => stickSnapshotState('after')}
          disabled={!PreviewStore.isVisibleHighlight && !PreviewStore.visibleHasAfter}
        >
          After
        </button>
      </div>

      <div className="input-group input-group-sm ms-2">
        <div className={'element url'}>{snapshot?.url}</div>
        <a className="btn btn-outline-primary d-inline-flex align-items-center" target={'_blank'} href={snapshot?.url}>
          Open
        </a>
      </div>

      <div className={'element ms-2'}>
        {snapshot?.viewport.width}x{snapshot?.viewport.height} ({(iframeSize.scale * 100).toFixed(0)}%)
      </div>
    </div>
  ));

  // TODO to optimize this, always have 2 iframes, one with the before state and one with the after.
  //      If the preview switches, just change the z-index and the visibility. This prevents the
  //      need for rerendering the snapshot. Also implement a "ready" state that waits for the
  //      "onload" callback to finish because the onload callback can cause "flickering" if it scrolls
  //      the element into view. Would be much nicer if the user doesn't see this processing.
  return (
    <div
      className={'d-flex flex-column preview'}
      style={{
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div className={'quick-navigation-container'}>
        {/*<QuickNavigation />*/}
        <PreviewInfo />
      </div>

      <div
        className={'d-flex iframe-wrapper bg-striped pb-3 position-relative'}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <div
          ref={iframeContainerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <iframe
            title={'Preview'}
            frameBorder="0"
            ref={iframeRef}
            sandbox={'allow-same-origin'}
            onLoad={({ target }) => {
              // @ts-ignore
              recoverAfterRender(PreviewStore.visibleCommand, PreviewStore.visibleSnapshot, target.contentDocument);
              loadHighlights(iframeRef, PreviewStore.visibleCommand, PreviewStore.visibleHighlightState);
            }}
            style={{
              transformOrigin: '0 0',
              transform: 'scale(' + iframeSize.scale + ')',
              width: iframeSize.width,
              height: iframeSize.height,
              visibility: !html ? 'hidden' : 'visible',
            }}
          />
          {!html && <div className={'no-selected-preview'}>No preview selected</div>}
        </div>
        <PreviewOverlay />
      </div>

      <ContextDetails />
      <PreviewFooter />
    </div>
  );
});
