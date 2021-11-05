import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { calculateIframeSize, useForceUpdate } from '../../Misc/Util';
import './Preview.scss';
import { loadHighlights } from '../Highlight';
import { PreviewStore } from '../../../index';
import { recoverAfterRender } from '../../Misc/SnapshotRecovering';

const Tab = ({ title, subTitle, active = null }) => {
  return (
    <div className={'tab rounded-3' + (active ? ' active' : '')}>
      <div className={'d-flex'}>
        <div className={'title flex-grow-1'}>{title}</div>
        <div>&times;</div>
      </div>
      <div className={'subTitle'}>{subTitle}</div>
    </div>
  );
};

const Logo = ({ className = null }) => (
  <div className={`logo ${className}`}>
    <div>PU</div>
    <div>TH</div>
  </div>
);

const QuickNavigation = () => {
  return (
    <>
      <div className={'d-flex tabs'}>
        <Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} active />
        <Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} />
        <Tab title={'googleTest'} subTitle={'tests/Browser/BasicTest'} />
        <Logo className={'ml-auto me-2'} />
      </div>
    </>
  );
};

export const Preview = observer(() => {
  const forceUpdate = useForceUpdate();
  const iframeRef = useRef<any>(null);
  const iframeContainerRef = useRef(null);

  // Handle window resize because preview iframe should scale to the minimum available space.
  useEffect(() => {
    let handleResize = () => forceUpdate();
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
    iframe.src = 'about:blank';
  }

  const PreviewInfo = () => (
    <div className="d-flex info">
      <div className="btn-group btn-group-sm" role="group">
        <button
          type="button"
          className={`btn m-0 ${
            PreviewStore.visibleHighlightState === 'before' ? 'btn-primary active' : 'btn-primary'
          }`}
          onClick={(_) => stickSnapshotState('before')}
          disabled={!PreviewStore.isVisibleHighlight && !PreviewStore.visibleHasBefore}
        >
          Before
        </button>
        <button
          type="button"
          className={`btn m-0 ${PreviewStore.visibleHighlightState === 'after' ? 'btn-primary active' : 'btn-primary'}`}
          onClick={(_) => stickSnapshotState('after')}
          disabled={!PreviewStore.isVisibleHighlight && !PreviewStore.visibleHasAfter}
        >
          After
        </button>
      </div>

      <div className="input-group input-group-sm ms-2">
        <div className={'element url'}>{snapshot?.url}</div>
      </div>

      <div className={'element ms-2'}>
        {snapshot?.viewport.width}x{snapshot?.viewport.height} ({(iframeSize.scale * 100).toFixed(0)}%)
      </div>

      <Logo className={'ms-2'} />
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

      <div className={'d-flex bg-striped ms-2'} style={{ flex: 1 }}>
        <div
          ref={iframeContainerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            visibility: !!html ? 'visible' : 'hidden',
            border: 'solid #46484b',
            borderWidth: '1px 0 0 1px',
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
              background: !!html ? 'white' : 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  );
});
