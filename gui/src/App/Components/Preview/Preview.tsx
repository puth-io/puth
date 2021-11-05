import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { ICommand } from '../Command/Command';
import { action } from 'mobx';
import { Events } from '../../../index';
import { resolveElement } from '../Highlight';
import { calculateIframeSize, useForceUpdate } from '../../Misc/Util';
import { PreviewStore } from './PreviewStore';
import './Preview.scss';
import { useBlobHandler } from '../../Misc/BlobHandler';

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

export const previewStore = new PreviewStore();

export const Preview = observer(() => {
  const forceUpdate = useForceUpdate();
  const iframeRef = useRef<any>(null);
  const iframeContainerRef = useRef(null);

  // Register all preview events
  useEffect(() => {
    const eventToggle = action((cmd: ICommand | undefined) => {
      if (previewStore.activeCommand?.id === cmd?.id) {
        previewStore.activeCommand = undefined;
        return;
      }

      if (previewStore.highlightCommand?.id === cmd?.id) {
        previewStore.highlightCommand = undefined;
      }

      previewStore.activeCommand = cmd;
      previewStore.activeState = 'after';
    });

    const eventHighlightShow = action((cmd: ICommand | undefined) => {
      if (previewStore.visibleCommand?.id === cmd?.id) {
        return;
      }
      previewStore.highlightCommand = cmd;
      previewStore.resetHighlightInterval();
    });

    const eventHighlightHide = action((cmd: ICommand | undefined) => {
      if (previewStore.highlightCommand?.id === cmd?.id) {
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

  const blobHandler = useBlobHandler(this, [previewStore.visibleSnapshot]);

  const stickSnapshotState = (state: 'before' | 'after') => {
    previewStore.activeState = state;
  };

  let command = previewStore.visibleCommand;
  let snapshot = previewStore.visibleSnapshot;
  let iframeSize = calculateIframeSize(snapshot, iframeContainerRef);

  let iframe: any = iframeRef?.current;

  let html;

  if (snapshot) {
    html = snapshot?.html?.src;

    // replace all script tags
    // html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/, '');
  }

  // Gets called after src of iframe changes
  let onIframeLoad = (doc) => {
    if (!doc) {
      return;
    }

    // Try to completely disable every scroll effect
    doc.documentElement.style.scrollBehavior = 'unset';
    doc.querySelector('body').addEventListener(
      'wheel',
      function (event: any) {
        event.stopPropagation();
      },
      true,
    );

    let resolveSrcFromCache = ({ src, base = snapshot?.url, returnType = null, mimeType = 'text/html' }) => {
      let matchUrls = [];

      if (src.startsWith('http://') || src.startsWith('https://')) {
        // find matching include on full srcurl
        matchUrls.push(src);
      } else if (src.startsWith('//')) {
        let url = new URL(base);
        matchUrls.push(url.origin + src.replace('//', '/'));
      } else if (src.startsWith('/')) {
        let url = new URL(base);
        matchUrls.push(url.origin + src);
      } else {
        matchUrls.push(new URL(src, base).href);
      }

      let resource = command.context.responses.find((pageInclude) => matchUrls.includes(pageInclude.url));

      if (!resource) {
        // TODO implement error handling
        // console.error('Could not find resource for url', matchUrls);
        return;
      }

      if (returnType === 'string') {
        // @ts-ignore
        return new TextDecoder().decode(resource.content);
      }

      // TODO create blob on websocket packet receiving because this does create a in memory blob every rerender
      //      and blobs need to be destroyed by hand.
      // @ts-ignore
      // const blob = new Blob([resource.content], { type: mimeType });
      // return URL.createObjectURL(blob);
      return blobHandler.createUrlFrom([resource.content], { type: mimeType });
    };

    // Restore dynamic html data form snapshot
    if (snapshot && snapshot.version === 2) {
      // pre resolve all nodes because we replace nodes in live dom
      let [styleSheets, untrackedState] = snapshot?.html?.untracked.map((untracked) =>
        untracked
          .map((item) => {
            let resolvedNode = resolveElement(item.path, doc);

            if (!resolvedNode) {
              console.error('Node not found for untracked item', item);
              return;
            }

            return {
              ...item,
              node: resolvedNode,
            };
          })
          .filter((item) => item != null),
      );

      // Recovers
      styleSheets.forEach((ss) => {
        let content;

        if (ss.href) {
          // if stylesheet has href set, resolve with cache
          content = resolveSrcFromCache({ src: ss.href, returnType: 'string' });
        } else {
          content = ss.content;
        }

        let rawStyleTag = doc.createElement('style');
        rawStyleTag.innerHTML = content;

        ss.node.replaceWith(rawStyleTag);
      });

      // Recovers element states
      untrackedState.forEach((el) => {
        el.node.value = el.value;
      });

      /**
       * Recover external stylesheets
       */
      [...doc.querySelectorAll('link')].forEach((link) => {
        // need to use getAttribute because if the resource isn't actually loaded, then link.href is empty
        let href = link.getAttribute('href');

        if (!href || href.startsWith('data:')) {
          return;
        }

        let hrefFull = new URL(href, snapshot?.url).href;

        let src = resolveSrcFromCache({ src: href, returnType: 'string' });

        if (!src) {
          return;
        }

        // Replace all url functions inside css with blobs if known
        src = src?.replace(/url\((.+?)\)+/g, (match) => {
          let url = match.substring(4, match.length - 1);
          let quote = '';

          if (url.startsWith("'") || url.startsWith('"')) {
            quote = url[0];
            url = url.substring(1, url.length - 1);
          }

          if (url.startsWith('data:')) {
            return match;
          }

          let resolved = resolveSrcFromCache({ src: url, base: hrefFull, mimeType: 'font' });

          if (!resolved) {
            return match;
          }

          return `url(${quote}${resolved}${quote})`;
        });

        const cssBlob = new Blob([src], { type: 'text/html' });
        link.href = URL.createObjectURL(cssBlob);
        link.dataset.puth_original_href = href;
      });

      /**
       * Recover parts that can not be tracked
       */
      [...doc.querySelectorAll('img')].forEach((img) => {
        // need to use getAttribute because if the resource isn't actually loaded, then img.src is empty
        let src = img.getAttribute('src');

        if (!src) {
          return;
        }

        // Skip data urls
        if (src.startsWith('data:')) {
          return;
        }

        img.src = resolveSrcFromCache({ src });

        if (img.srcset) {
          let candidates = img.srcset.split(',');

          img.srcset = candidates
            .map((candidate) => {
              let [cSrc, cSize] = candidate.split(' ');

              return `${resolveSrcFromCache({ src: cSrc })} ${cSize}`;
            })
            .join(',');
        }
      });

      // Remove all noscript tags since javascript is enabled. If javascript is disabled, don't do anything.
      // This exists because the iframe has javascript disabled therefore noscript tag would be displayed.
      if (snapshot.isJavascriptEnabled) {
        [...doc.querySelectorAll('noscript')].forEach((el) => el.remove());
      }

      // TODO check if there are other tags that need to be reinjected from the context.responses resources.
    }

    // Load the highlights for the snapshot
    // TODO to optimize this, always have 2 iframes, one with the before state and one with the after.
    //      If the preview switches, just change the z-index and the visibility. This prevents the
    //      need for rerendering the snapshot. Also implement a "ready" state that waits for the
    //      "onload" callback to finish because the onload callback can cause "flickering" if it scrolls
    //      the element into view. Would be much nicer if the user doesn't see this processing.
    // loadHighlights(iframeRef, previewStore.visibleCommand, previewStore.visibleHighlightState);
  };

  // Check if snapshot contains any html to display
  if (iframe && html) {
    // Using a blob is faster than putting the src into 'srcdoc' and also faster than iframe.document.write
    // (which is also not the best to use). Creating a blob allows the browser to load the data into the
    // iframe in a usual way.

    let time = Date.now();
    console.log('---- creating blob');
    // const blob = new Blob([html], { type: 'text/html' });
    // iframe.src = URL.createObjectURL(blob);

    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
    onIframeLoad(parsedDocument);

    const documentBlob = new Blob([parsedDocument.documentElement.innerHTML], { type: 'text/html' });
    iframe.src = URL.createObjectURL(documentBlob);

    console.log(iframe?.contentWindow?.document);
    console.log('---- creating blob', Date.now() - time + 'ms');
  } else if (iframe && !snapshot) {
    // cleans iframe
    iframe.src = 'about:blank';
  }

  const PreviewInfo = () => (
    <div className="d-flex info">
      <div className="btn-group btn-group-sm" role="group">
        <button
          type="button"
          className={`btn m-0 ${
            previewStore.visibleHighlightState === 'before' ? 'btn-primary active' : 'btn-primary'
          }`}
          onClick={(_) => stickSnapshotState('before')}
          disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasBefore}
        >
          Before
        </button>
        <button
          type="button"
          className={`btn m-0 ${previewStore.visibleHighlightState === 'after' ? 'btn-primary active' : 'btn-primary'}`}
          onClick={(_) => stickSnapshotState('after')}
          disabled={!previewStore.isVisibleHighlight && !previewStore.visibleHasAfter}
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
    </div>
  );

  return (
    <div
      className={'d-flex flex-column preview'}
      style={{
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div className={'quick-navigation-container'}>
        <QuickNavigation />
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
            // onLoad={({ target }) =>
            //   loadHighlights(iframeRef, previewStore.visibleCommand, previewStore.visibleHighlightState)
            // }
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
