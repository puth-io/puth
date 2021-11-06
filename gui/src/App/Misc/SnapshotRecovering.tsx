import { resolveElement } from '../Components/Highlight';
import { BlobHandler as BlobHandlerClass } from './BlobHandler';
import { PreviewStore } from '../../index';

export const BlobHandler = new BlobHandlerClass();

export function disableScrollBehavior(doc) {
  doc.querySelector('body').style.scrollBehavior = 'unset';
  doc.querySelector('body').addEventListener(
    'wheel',
    function (event: any) {
      event.stopPropagation();
    },
    true,
  );
}

let resolveSrcFromCache = ({
  src,
  base = PreviewStore.visibleSnapshot?.url,
  returnType = null,
  mimeType = 'text/html',
}) => {
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

  let resource = PreviewStore.visibleCommand.context.responses.find((pageInclude) =>
    matchUrls.includes(pageInclude.url),
  );

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
  return BlobHandler.createUrlFrom([resource.content], { type: mimeType });
};

export function recover(command, snapshot, doc) {
  if (!doc || !PreviewStore.hasVisibleSnapshotSource || snapshot.version !== 2) {
    return;
  }

  /**
   * Disable any scroll behavior
   */
  let puthStyleOverride = document.createElement('style');
  puthStyleOverride.innerHTML = 'html, body { scroll-behavior: unset!important; }';
  puthStyleOverride.dataset.name = 'puth_scroll_behavior_override';
  doc.querySelector('head').appendChild(puthStyleOverride);

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

    link.href = BlobHandler.createUrlFromString(src, { type: 'text/html' });
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

// TODO run after iframe draw because setting 'inline' styles or adding listeners doesn't work if the document isn't
//      live (currently rendered in browser: current document, iframe, ...)
export function recoverAfterRender(command, snapshot, doc) {
  if (!doc || !PreviewStore.hasVisibleSnapshotSource || snapshot.version !== 2) {
    return;
  }

  disableScrollBehavior(doc);

  /**
   * Recover dynamic stylesheets and untracked states
   *  - dynamic:
   *    f.e. styled web components do add their style at runtime without setting innerHTML of the
   *    associated style tag and would therefore be empty
   *
   *  - untracked states:
   *    Elements like input, textarea, ... are browser dependent meaning their state (value) isn't stored
   *    inside the dom and therefore needs to be scraped and reapplied
   */
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
}