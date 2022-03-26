import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { calculateIframeSize, useForceUpdatePreview } from '../../Misc/Util';
import './Preview.scss';
import { loadHighlights } from '../Highlight';
import { DebugStore, PreviewStore } from '../../../main';
import { recoverAfterRender } from '../../Misc/SnapshotRecovering';
import { WebsocketHandler } from '../../Misc/WebsocketHandler';
import { Resizable } from 're-resizable';

import prism from 'prismjs';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.css';
import 'prismjs/themes/prism-tomorrow.min.css';

// @ts-ignore
const Tab = ({ title, subTitle = null, active = null, deletable = true }) => {
  return (
    <div className={'tab rounded-3' + (active ? ' active' : '')}>
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

const Split = () => <span className={'split'}> | </span>;

const FooterMetrics = observer(() => {
  let { contexts, events } = WebsocketHandler.getMetrics();

  let bytesReceived = (WebsocketHandler.getTotalBytesReceived() / 1000 / 1000).toFixed(2);

  return (
    <div>
      {`${contexts} contexts`}
      <Split />
      {`${events} events`}
      <Split />
      {`${bytesReceived} MB received`}
    </div>
  );
});

export default function Code({ code }) {
  let ref = useRef();

  useEffect(() => {
    if (ref.current) {
      prism.highlightElement(ref.current);
    }
  }, [ref.current]);

  let language = 'php';

  return (
    <pre className={`language-${language}`}>
      <code ref={ref} className={`language-${language} line-numbers`}>
        {code}
      </code>
    </pre>
  );
}

export const Files = ({ files }) =>
  files.map((file, idx) => (
    <div key={idx}>
      <div className={'footer'}>{file.path}</div>
      <Code code={file.content} />
    </div>
  ));

export const SPACE = <>&nbsp;</>;

export const Trace = ({ trace }) => {
  return (
    <div className={'border-top border-default p-2'}>
      {trace.map((frame, idx) => (
        <div key={idx}>
          {frame.file}:{frame.line}
        </div>
      ))}
    </div>
  );
};

export const Exception = ({ exception }) => {
  let { runner, origin, lang } = exception.data;
  let { code, file, files, line, message, trace } = exception.data.exception;

  let [active, setActive] = useState('message');

  return (
    <>
      <div className={'footer'}>
        <div className={'tab-menu'}>
          <div className={`tab-button ${active === 'message' && 'active'}`} onClick={(_) => setActive('message')}>
            Message
          </div>
          <div className={`tab-button ${active === 'trace' && 'active'}`} onClick={(_) => setActive('trace')}>
            Trace
          </div>
          <div className={`tab-button ${active === 'files' && 'active'}`} onClick={(_) => setActive('files')}>
            Files
          </div>
        </div>
        <div className={'ml-auto'}>
          {`Origin: ${origin}`}
          <Split />
          {`Runner: ${runner}`}
          <Split />
          {`Language: ${lang}`}
        </div>
      </div>
      <div className={'overflow-auto'}>
        {active === 'trace' && <Trace trace={trace} />}
        {active === 'files' && <Files files={files} />}
        {active === 'message' && (
          <div className={'border-top border-default p-2'}>
            {message.split('\n').map((messageLine, idx) => (
              <div key={idx}>{messageLine || SPACE}</div>
            ))}
            <br />
            <Trace trace={trace} />
          </div>
        )}
      </div>
    </>
  );
};

export const PreviewFooterContextInfo = observer(() => {
  const forceUpdatePreview = useForceUpdatePreview();

  if (!PreviewStore.activeContext) {
    return <></>;
  }

  let hasExceptions = PreviewStore.activeContext?.exceptions?.length > 0;

  let tabsEnabled = hasExceptions;

  return (
    <Resizable
      className={'d-flex flex-column border-left border-default bg-dark-5'}
      defaultSize={{
        height: tabsEnabled ? 400 : 23,
        width: '100%',
      }}
      minHeight={23}
      enable={{ top: true }}
      onResizeStop={forceUpdatePreview}
    >
      <div className={'footer'}>
        <div className={'tab-menu'}>{hasExceptions && <div className={'tab-button active'}>Exceptions</div>}</div>
        <div className={'ml-auto'}>{PreviewStore.activeContext && `Context: ${PreviewStore.activeContext?.id}`}</div>
      </div>
      {tabsEnabled && (
        <div className={'d-flex flex-column border-default tab-content min-h-0'}>
          {PreviewStore.activeContext?.activeTab === 'exceptions' &&
            PreviewStore.activeContext?.exceptions.map((exception, idx) => (
              <Exception key={idx} exception={exception} />
            ))}
        </div>
      )}
    </Resizable>
  );
});

export const PreviewFooter = observer(() => {
  return (
    <div className={'footer border-left border-default z-10'}>
      <FooterMetrics />
      <div className={'ml-auto'}>
        <input
          type="checkbox"
          className="form-check-input me-2"
          id="remove-script-tags-checkbox"
          checked={PreviewStore.removeScriptTags}
          onChange={() => (PreviewStore.removeScriptTags = !PreviewStore.removeScriptTags)}
        />
        <label className="form-check-label" htmlFor="remove-script-tags-checkbox">
          Remove script tags
        </label>
      </div>
      <div>
        <input
          type="checkbox"
          className="form-check-input me-2"
          id="darken-preview-checkbox"
          checked={PreviewStore.darken}
          onChange={() => (PreviewStore.darken = !PreviewStore.darken)}
        />
        <label className="form-check-label" htmlFor="darken-preview-checkbox">
          Darken preview
        </label>
      </div>
      <div>
        <input
          type="checkbox"
          className="form-check-input me-2"
          id="debug-checkbox"
          checked={DebugStore.debug}
          onChange={() => (DebugStore.debug = !DebugStore.debug)}
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

  // Handle window resize because preview iframe should scale to the minimum available space.
  useEffect(() => {
    let handleResize = () => forceUpdatePreview();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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

  const PreviewInfo = () => (
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
  );

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

      <div className={'d-flex iframe-wrapper bg-striped'} style={{ flex: 1, overflow: 'hidden' }}>
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
          <PreviewOverlay />
          {!html && <div className={'no-selected-preview'}>No preview selected</div>}
        </div>
      </div>

      <PreviewFooterContextInfo />
      <PreviewFooter />
    </div>
  );
});
