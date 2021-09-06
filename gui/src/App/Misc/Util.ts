import { useState } from 'react';

export function pMark(name) {
  performance.mark(name);
}

export function pMeasure(name, startMark) {
  performance.mark(name);
  performance.measure(name, startMark);
}

export function useForceUpdate() {
  const [value, setValue] = useState(0);
  return () => setValue((val) => val + 1);
}

// Calculates the iframe size relative to the available space
// and keeps the dimensions and scale of the original viewport
export function calculateIframeSize(snapshot: any | undefined, iframeContainer: any) {
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

export function roughSizeOfObject(object) {
  let objectList: any[] = [];
  let stack: any[] = [object];
  let bytes = 0;

  while (stack.length) {
    let value = stack.pop();

    if (typeof value === 'boolean') {
      bytes += 4;
    } else if (typeof value === 'string') {
      bytes += value.length * 2;
    } else if (typeof value === 'number') {
      bytes += 8;
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value);

      for (let i in value) {
        if (!value.hasOwnProperty(i)) {
          continue;
        }

        stack.push(value[i]);
      }
    }
  }
  return bytes;
}

export function snapshotSize(snapshot) {
  let size = [0, 0, 0, 0];

  if (!size) {
    return size;
  }

  if (snapshot?.html?.src) {
    size[1] += snapshot.html?.src.length;
  }

  if (snapshot?.html?.untracked?.length === 2) {
    snapshot?.html?.untracked[0].forEach((ut) => {
      size[2] += ut?.content?.length;
    });
    snapshot?.html?.untracked[1].forEach((ut) => {
      size[3] += ut?.value?.length;
    });
  }

  size[0] = size[1] + size[2] + size[3];

  return size;
}

export function snapshotSizeOf(snapshots) {
  let size = {
    total: 0,
    before: [0, 0, 0, 0],
    after: [0, 0, 0, 0],
  };

  for (let i in snapshots) {
    size[i] = snapshotSize(snapshots[i]);
    size.total += size[i][0];
  }

  return size;
}

export function logData(data) {
  if (Array.isArray(data)) {
    data.forEach((d) => logMessage(d));
  } else {
    logMessage(data);
  }
}

export function logMessage(message) {
  if (message.type === 'command') {
    logCommand(message);
  } else if (message.type === 'response') {
    logResponse(message);
  } else if (message.type === 'log') {
    logLog(message);
  } else if (message.type === 'context') {
    logContext(message);
  } else {
    console.warn(message);
  }
}

export function logCommand(packet) {
  let has = '';
  if (packet.snapshots?.after || packet.snapshots?.before) has += 'S';

  let snapshotSize = snapshotSizeOf(packet.snapshots);
  let snapshotSizeTotal = (snapshotSize.total / 1000).toFixed(2);
  let snapshotSizeHtml = ((snapshotSize?.before[1] + snapshotSize?.after[1]) / 1000).toFixed(2);
  let snapshotSizeCss = ((snapshotSize?.before[2] + snapshotSize?.after[2]) / 1000).toFixed(2);
  let snapshotSizeJs = ((snapshotSize?.before[3] + snapshotSize?.after[3]) / 1000).toFixed(2);

  let kbBlock = ['color: #18c0d1', 'kb', 'color: #d2d3d3'];

  console.groupCollapsed(
    '%s %s %c%s %c%s%c%s%c [%s%c%s%c, %s%c%s%c, %s%c%s%c] %s',
    packet.context.id,
    packet.type,
    'color: #bada55',
    has.length === 0 ? '-' : has,
    'color: #d2d3d3',
    snapshotSizeTotal,
    ...kbBlock,
    snapshotSizeHtml,
    ...kbBlock,
    snapshotSizeCss,
    ...kbBlock,
    snapshotSizeJs,
    ...kbBlock,
    packet.func,
  );

  console.group('Snapshots');
  for (let i in packet.snapshots) {
    logSnapshot(i, packet.snapshots[i]);
  }
  console.groupEnd();

  console.log('source', packet);

  console.groupEnd();
}

export function logSnapshot(type, snapshot) {
  if (!snapshot) {
    return;
  }

  let size = snapshotSize(snapshot);

  console.group(type);
  console.log('Url:', snapshot.url);
  console.log('Size total:', (size[0] / 1000).toFixed(2), 'kb');
  console.log('Size html:', (size[1] / 1000).toFixed(2), 'kb');
  console.log('Size css:', (size[2] / 1000).toFixed(2), 'kb');
  console.log('Size js:', (size[3] / 1000).toFixed(2), 'kb');
  console.log('Viewport:', snapshot.viewport);
  console.log('Version:', snapshot.version);
  console.log(snapshot);
  console.groupEnd();
}

export function logResponse(packet: any) {
  console.groupCollapsed(
    packet.context.id,
    packet.type,
    (packet.content.length / 1000).toFixed(2),
    'kb',
    packet.resourceType,
    packet.method,
    packet.url.length > 64 ? packet.url.substring(0, 60) + '...' : packet.url,
  );
  console.log('Headers');
  console.table(packet.headers);
  console.log('source', packet);
  console.groupEnd();
}

export function logLog(packet) {
  console.groupCollapsed(packet.context.id, packet.type, packet.messageType, packet.args);
  console.log('source', packet);
  console.groupEnd();
}

export function logContext(packet) {
  console.groupCollapsed(packet.id, packet.type);
  console.log('source', packet);
  console.groupEnd();
}
