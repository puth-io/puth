import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { ICommand } from './Command';
import { action, makeAutoObservable } from 'mobx';
import { Events } from '../index';
import { loadHighlights, resolveElement } from './Highlight';
import { useForceUpdate } from './Util';
import { ISnapshot } from '../../../src/server/src/Snapshots';

// Calculates the iframe size relative to the available space
// and keeps the dimensions and scale of the original viewport
function calculateIframeSize(snapshot: ISnapshot | undefined, iframeContainer: any) {
  let size = {
    container: {
      width: '',
      height: '',
    },
    width: '100%',
    height: '100%',
    scale: 1,
  };

  if (!snapshot?.viewport || !iframeContainer.current) {
    return size;
  }

  let { width, height } = snapshot.viewport;
  let { offsetWidth, offsetHeight } = iframeContainer.current;

  let scaleFactorX = offsetWidth / width;
  let scaleFactorY = offsetHeight / height;

  let smallestFactor = scaleFactorX < scaleFactorY ? scaleFactorX : scaleFactorY;

  size.container.width = offsetWidth + 'px';
  size.container.height = offsetHeight + 'px';

  size.width = width + 'px';
  size.height = height + 'px';

  if (smallestFactor < 1) {
    size.scale = smallestFactor;
    size.container.width = width * smallestFactor + 'px';
    size.container.height = height * smallestFactor + 'px';
  }

  return size;
}

export type SnapshotState = 'before' | 'after';

class PreviewStore {
  activeCommand: ICommand | undefined;
  activeState: SnapshotState = 'before';
  highlightCommand: ICommand | undefined;
  highlightState: SnapshotState = 'before';
  private highlightInterval: number;

  constructor() {
    makeAutoObservable(this);

    this.highlightInterval = window.setInterval(() => this.toggleHighlightState(), 1000);
  }

  toggleHighlightState() {
    this.highlightState = this.highlightState === 'before' ? 'after' : 'before';
  }

  get visibleCommand() {
    return this.highlightCommand ?? this.activeCommand;
  }

  get visibleHighlightState() {
    if (!this.visibleCommand?.snapshots?.before) {
      return 'after';
    }
    if (!this.visibleCommand?.snapshots?.after) {
      return 'before';
    }
    return this.highlightCommand ? this.highlightState : this.activeState;
  }

  get visibleSnapshot() {
    return this.visibleCommand?.snapshots[this.visibleHighlightState];
  }

  get visibleHasBefore() {
    return this.visibleCommand?.snapshots && 'before' in this.visibleCommand.snapshots;
  }

  get visibleHasAfter() {
    return this.visibleCommand?.snapshots && 'after' in this.visibleCommand.snapshots;
  }

  get visibleHasSnapshots() {
    return Array.isArray(this.visibleCommand?.snapshots);
  }

  get isVisibleHighlight() {
    return this.highlightCommand !== undefined;
  }
}

export const previewStore = new PreviewStore();

export const Preview = observer(() => {
  const forceUpdate = useForceUpdate();
  const iframeRef = useRef<any>(null);
  const iframeContainerRef = useRef(null);

  // Register all preview events
  useEffect(() => {
    const eventToggle = action((cmd: ICommand | undefined) => {
      if (previewStore.activeCommand === cmd) {
        previewStore.activeCommand = undefined;
        return;
      }

      if (previewStore.highlightCommand === cmd) {
        previewStore.highlightCommand = undefined;
      }

      previewStore.activeCommand = cmd;
      previewStore.activeState = 'after';
    });

    const eventHighlightShow = action((cmd: ICommand | undefined) => {
      if (previewStore.visibleCommand === cmd) {
        return;
      }
      previewStore.highlightCommand = cmd;
    });

    const eventHighlightHide = action((cmd: ICommand | undefined) => {
      if (previewStore.highlightCommand === cmd) {
        previewStore.highlightCommand = undefined;
      }
    });

    Events.on('preview:toggle', eventToggle);
    Events.on('preview:highlight:show', eventHighlightShow);
    Events.on('preview:highlight:hide', eventHighlightHide);

    return () => {
      Events.off('preview:toggle', eventToggle);
      Events.off('preview:highlight:show', eventHighlightShow);
      Events.off('preview:highlight:hide', eventHighlightHide);
    };
  }, []);

  // Handle window resize because preview iframe should scale to the minimum available space.
  useEffect(() => {
    let handleResize = () => forceUpdate();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  const stickSnapshotState = (state: 'before' | 'after') => {
    previewStore.activeState = state;
  };

  let command = previewStore.visibleCommand;
  let snapshot = previewStore.visibleSnapshot;
  let size = calculateIframeSize(snapshot, iframeContainerRef);

  let iframe: any = iframeRef?.current;

  let html;

  if (snapshot && snapshot.version === 1) {
    html = snapshot?.html;
  } else if (snapshot && snapshot.version === 2) {
    // TODO fix replace. Also, replace on server side?
    html = snapshot?.html?.src.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/, '');
  }

  // Check if snapshot contains any html to display
  if (html) {
    // Using a blob is faster than putting the src into 'srcdoc' and also faster than iframe.document.write
    // (which is also not the best to use). Creating a blob allows the browser to load the data into the
    // iframe in a usual way.
    const blob = new Blob([html], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
  } else if (iframe && !snapshot) {
    // cleans iframe
    iframe.src = 'about:blank';
  }

  // Gets called after src of iframe changes
  let onIframeLoad = ({ target }) => {
    let iframeDoc = target?.contentWindow?.document;
    if (!iframeDoc) {
      return;
    }

    // Try to completely disable every scroll effect
    iframeDoc.documentElement.style.scrollBehavior = 'unset';
    iframeDoc.querySelector('body').addEventListener(
      'wheel',
      function (event: any) {
        event.stopPropagation();
      },
      true,
    );

    // Restore dynamic html data form snapshot
    if (snapshot && snapshot.version === 2) {
      let [styleSheets, us] = snapshot?.html?.untracked;
      let rp = [];

      styleSheets.forEach((ss) => {
        rp.push({
          node: resolveElement(ss.path, iframeDoc),
          content: ss.content,
        });
      });
      rp.forEach((ss) => {
        let rawStyleTag = iframeDoc.createElement('style');
        rawStyleTag.innerHTML = ss.content;

        if (!ss.node) {
          console.error('StyleNode to replace not found!', ss);
          return;
        }
        ss.node.replaceWith(rawStyleTag);
      });
      us.forEach((el) => {
        let node = resolveElement(el.path, iframeDoc);
        if (!node) {
          console.error('Node for state recovery not found!', node);
          return;
        }
        node.value = el.value;
      });

      [...iframeDoc.querySelectorAll('img')].forEach((img) => {
        // need to use getAttribute because if the resource isn't actually loaded, then img.src is empty
        let src = img.getAttribute('src');
        let matchUrl = '';

        if (src.startsWith('http://') || src.startsWith('https://')) {
          // find matching include on full srcurl
          matchUrl = src;
        } else if (src.startsWith('//')) {
          matchUrl = snapshot.url + src.replace('//', '');
        } else {
          matchUrl = snapshot.url + src;
        }

        let resource = command.context.responses.find((pageInclude) => pageInclude.url === matchUrl);

        if (!resource) {
          // TODO implement error handling
          return;
        }

        // TODO create blob on websocket packet receiving because this does create a in memory blob every rerender
        //      and blobs need to be destroyed by hand.
        const blob = new Blob([Uint8Array.from(resource.content.data)]);
        img.src = URL.createObjectURL(blob);
      });

      // Remove all noscript tags since javascript is enabled. If javascript is disabled, don't do anything.
      // This exists because the iframe has javascript disabled therefore noscript tag would be displayed.
      if (snapshot.isJavascriptEnabled) {
        [...iframeDoc.querySelectorAll('noscript')].forEach(el => el.remove());
      }

      // TODO check if there are other tags that need to be reinjected from the context.responses resources.
    }

    // Load the highlights for the snapshot
    // TODO to optimize this, always have 2 iframes, one with the before state and one with the after.
    //      If the preview switches, just change the z-index and the visibility. This prevents the
    //      need for rerendering the snapshot. Also implement a "ready" state that waits for the
    //      "onload" callback to finish because the onload callback can cause "flickering" if it scrolls
    //      the element into view. Would be much nicer if the user doesn't see this processing.
    loadHighlights(iframeRef, previewStore.visibleCommand, previewStore.visibleHighlightState);
  };

  return (
    <div
      className="d-flex flex-column"
      style={{
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div className="d-flex py-2 ps-2">
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn m-0 btn-primary ${previewStore.visibleHighlightState === 'before' && 'active'}`}
            onClick={(_) => stickSnapshotState('before')}
            disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasBefore}
          >
            Before
          </button>
          <button
            type="button"
            className={`btn m-0 btn-primary ${previewStore.visibleHighlightState === 'after' && 'active'}`}
            onClick={(_) => stickSnapshotState('after')}
            disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasAfter}
          >
            After
          </button>
        </div>
        <div className="input-group input-group-sm ms-2">
          <span className="input-group-text" id="basic-addon1">
            Url
          </span>
          <input type="text" className="form-control" defaultValue={snapshot?.url} readOnly disabled />
        </div>
        <button type="button" className="btn m-0 btn-primary text-nowrap ms-2 me-2" disabled>
          {snapshot?.viewport.width}x{snapshot?.viewport.height} ({(size.scale * 100).toFixed(0)}%)
        </button>
      </div>
      <div className={'d-flex bg-striped'} style={{ flex: 1 }}>
        <div
          ref={iframeContainerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            visibility: !!html ? 'visible' : 'hidden',
          }}
        >
          <iframe
            title={'Preview'}
            frameBorder="0"
            ref={iframeRef}
            sandbox={'allow-same-origin'}
            onLoad={onIframeLoad}
            style={{
              transformOrigin: '0 0',
              transform: 'scale(' + size.scale + ')',
              width: size.width,
              height: size.height,
              background: !!html ? 'white' : 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  );
});
