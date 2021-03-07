import React from 'react';
import { ICommand } from './Command';
import { render } from 'react-dom';

function scrollIntoView(element: Element | null) {
  if (!element) {
    return;
  }

  // @ts-ignore
  if (element.scrollIntoViewIfNeeded) {
    // chrome supports 'new' scrollIntoViewIfNeeded
    // @ts-ignore
    element.scrollIntoViewIfNeeded(true);
  } else {
    // fallback works everywhere except IE and Safari
    // @ts-ignore
    element.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

export function resolveElement(el: any, root: Document) {
  el = el.map((item: any) => (Array.isArray(item) ? `${item[0]}:nth-of-type(${item[1] + 1})` : item));
  return root.querySelector(el.join(' > '));
}

export function loadHighlights(
  iframe: React.MutableRefObject<null | HTMLIFrameElement>,
  command: ICommand | undefined,
  snapshotState: 'before' | 'after',
) {
  if (!iframe?.current?.contentWindow || !command || command.errors.length > 0) {
    return;
  }

  let frame = iframe.current.contentWindow.document;

  if (!frame.body) {
    return;
  }

  let { func, args, on } = command;
  let { path } = on;

  // path is always an array because the user can perform the same function on multiple elements
  // this is a precaution for future functions or other plugins
  path.forEach((el) => {
    let root: any = frame.body;

    // only if el is a path then change root to this element
    if (Array.isArray(el)) {
      root = resolveElement(el, frame);
    }

    if (!root) {
      return;
    }

    if (func === '$') {
      let selectedElement = root.querySelector(args[0]);

      scrollIntoView(selectedElement);

      highlight(root, frame, true);
      highlight(root.querySelector(args[0]), frame);
    } else if (func === 'type') {
      scrollIntoView(root);
      highlight(root, frame);
    } else if (func === 'type' && snapshotState === 'before') {
      scrollIntoView(root);
      highlight(root, frame);
    }
  });

  function highlight(element: any, context: Document, root = false) {
    if (!element) {
      return;
    }

    let position = getPosition(element);

    let highlightSize = {
      width: element.scrollWidth > element.offsetWidth ? element.scrollWidth : element.offsetWidth,
      height: element.scrollHeight > element.offsetHeight ? element.scrollHeight : element.offsetHeight,
    };

    let overlay = (
      <div
        style={{
          zIndex: 999999,
          border: root ? '2px dashed orange' : '2px dashed rgb(49 109 220)',
          borderStyle: 'dashed',
          position: 'absolute',
          top: position.top + 'px',
          left: position.left + 'px',
          width: highlightSize.width + 'px',
          height: highlightSize.height + 'px',
          pointerEvents: 'none',
        }}
      />
    );

    let node = document.createElement('div');
    context.body.appendChild(node);
    render(overlay, node);
  }

  function getPosition(element: any) {
    let top = 0;
    let left = 0;

    do {
      top += element.offsetTop || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);

    return {
      top,
      left,
    };
  }
}
