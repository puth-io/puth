// @ts-nocheck
import { resolveElement } from '../Components/Highlight';
import { BlobHandler as BlobHandlerClass } from './BlobHandler';
import PreviewStore from "../Mobx/PreviewStore";

export const BlobHandler = new BlobHandlerClass();
export const textDecoder = new TextDecoder();

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

let getHeader = (headers, find) => {
  find = find.toLowerCase();

  for (let header of Object.keys(headers)) {
    if (header.toLowerCase() === find) {
      return headers[header];
    }
  }

  return '';
};

let findResourceInCache = ({ src, base = PreviewStore.visibleSnapshot?.url }) => {
  let matchUrl;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    // find matching include on full srcurl
    matchUrl = src;
  } else if (src.startsWith('//')) {
    let url = new URL(base);
    matchUrl = url.origin + src.replace('//', '/');
  } else if (src.startsWith('/')) {
    let url = new URL(base);
    matchUrl = url.origin + src;
  } else {
    matchUrl = new URL(src, base).href;
  }
  
  // $url1 = https://playground.puth.dev/assets/bootstrap/bootstrap.min.css
  // ../../fontawesome.font
  
  // $url1 ../ fontawesome.font
  // https://playground.puth.dev/assets/fontawesome.font
  // TODO resolve relatives "../"
  // TODO img
  // TODO run LiveView setViewport after createBrowser
  // TODO better way to determine which screencast frame was after a command

  return PreviewStore.visibleCommand.context.responses.find(function matchResponseUrl(pageInclude) {
    return matchUrl === pageInclude.url;
  });
};

let resolveSrcFromCache = ({
  resource = null,
  src,
  base = PreviewStore.visibleSnapshot?.url,
  returnType = null,
  mimeType = 'text/html',
}) => {
  if (!resource) {
    resource = findResourceInCache({ src, base });
  }

  if (!resource) {
    // TODO implement error handling
    // console.error('Could not find resource for url', matchUrls);
    return;
  }

  let contentType = getHeader(resource.headers, 'content-type');
  if (contentType) {
    mimeType = contentType;
  }

  if (!returnType && resource?.contentParsed?.blob) {
    let { url, blob, options } = resource.contentParsed.blob;

    if (url && blob && options?.type === mimeType) {
      return url;
    }
  }

  if (returnType === 'string') {
    if (resource?.contentParsed?.string) {
      return resource?.contentParsed?.string;
    }

    if (ArrayBuffer.isView(resource.content)) {
      let parsedString = textDecoder.decode(resource.content);
      resource.contentParsed.string = parsedString;
      resource.content = undefined;

      return parsedString;
    }

    // TODO handle error? is this even possible?
  }

  // TODO create blob on websocket packet receiving because this does create a in memory blob every rerender
  //      and blobs need to be destroyed by hand.
  let blobHandle = BlobHandler.createUrlFrom([resource.content], { type: mimeType, track: false });

  resource.contentParsed.blob = blobHandle;
  resource.content = undefined;

  return blobHandle.url;
};

export function resolveCssLinksToLocal(src, base) {
  return src?.replace(/url\((.+?)\)+/g, function matchedCssLinks(match) {
    let url = match.substring(4, match.length - 1);
    let quote = '';

    if (url.startsWith("'") || url.startsWith('"')) {
      quote = url[0];
      url = url.substring(1, url.length - 1);
    }

    if (url.startsWith('data:')) {
      return match;
    }

    let resolved = resolveSrcFromCache({ src: url, base });

    if (!resolved) {
      return match;
    }

    return `url(${quote}${resolved}${quote})`;
  });
}

export function recover(command, snapshot, doc) {
  if (
    !doc ||
    !PreviewStore.hasVisibleSnapshotSource ||
    (snapshot.version !== 2 && snapshot.version !== 3 && snapshot.version !== 4)
  ) {
    return;
  }

  // Important: for of was chosen because of performance reasons

  /**
   * Recover external stylesheets
   */
  for (let link of doc.querySelectorAll('link')) {
    // need to use getAttribute because if the resource isn't actually loaded, then link.href is empty
    let href = link.getAttribute('href');

    if (!href || href.startsWith('data:')) {
      continue;
    }

    let hrefFull = new URL(href, snapshot?.url).href;

    let resource = findResourceInCache({ src: href });

    let blobHandle = resource?.contentParsed?.blob;

    if (!blobHandle) {
      let src = resolveSrcFromCache({ src: href, resource, returnType: 'string' });

      if (!src) {
        continue;
      }

      // Replace all url functions inside css with blobs if known
      src = resolveCssLinksToLocal(src, hrefFull);

      blobHandle = BlobHandler.createUrlFromString(src, { type: 'text/html', track: false });
      resource.contentParsed.blob = blobHandle;
      resource.content = undefined;
    }

    link.href = blobHandle.url;
    link.dataset.puth_original_href = href;
  }

  /**
   * Recover all external resources inside style tags
   */
  for (let style of doc.querySelectorAll('style')) {
    style.innerHTML = resolveCssLinksToLocal(style.innerHTML, snapshot?.href);
  }

  /**
   * Recover parts that can not be tracked
   */
  for (let img of doc.querySelectorAll('img')) {
    // need to use getAttribute because if the resource isn't actually loaded, then img.src is empty
    let src = img.getAttribute('src');

    if (!src) {
      continue;
    }

    // Skip data urls
    if (src.startsWith('data:')) {
      continue;
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
  }

  // Remove all noscript tags since javascript is enabled. If javascript is disabled, don't do anything.
  // This exists because the iframe has javascript disabled therefore noscript tag would be displayed.
  if (snapshot.isJavascriptEnabled) {
    for (let script of doc.querySelectorAll('noscript')) {
      script.remove();
    }
  }

  for (let script of doc.querySelectorAll('script')) {
    if (PreviewStore.removeScriptTags) {
      script.remove();
    } else {
      let src = script.getAttribute('src');
      script.setAttribute('src', '');
      script.setAttribute('puth_original_src', src);
    }
  }

  /**
   * Disable any scroll behavior
   */
  let puthStyleOverride = document.createElement('style');
  puthStyleOverride.innerHTML = 'html, body { scroll-behavior: unset!important; }';
  puthStyleOverride.dataset.name = 'puth_scroll_behavior_override';
  doc.querySelector('head').appendChild(puthStyleOverride);

  // TODO check if there are other tags that need to be reinjected from the context.responses resources.
}

// TODO run after iframe draw because setting 'inline' styles or adding listeners doesn't work if the document isn't
//      live (currently rendered in browser: current document, iframe, ...)
export function recoverAfterRender(command, snapshot, doc) {
  if (!doc || !PreviewStore.hasVisibleSnapshotSource) {
    return;
  }

  let ut = [];

  if (snapshot?.version === 2) {
    ut = snapshot?.html?.untracked;
  } else if (snapshot?.version === 3) {
    ut = snapshot?.data?.untracked;
  } else if (snapshot?.version === 4) {
    ut = snapshot?.data?.untracked;
  } else {
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
  let [styleSheets, untrackedState] = ut.map((untracked) =>
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
    let rawStyleTag = doc.createElement('style');
    rawStyleTag.innerHTML = resolveCssLinksToLocal(ss?.content, snapshot?.href);

    ss.node.replaceWith(rawStyleTag);
  });

  // Recovers element states
  untrackedState.forEach((el) => {
    el.node.value = el.value;
  });
}
