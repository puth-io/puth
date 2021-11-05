import { useState, useEffect } from 'react';

export class BlobHandler {
  private component: any;

  private blobs = [];
  private urls = [];

  constructor(component) {
    this.component = component;
  }

  createUrlFromString(source: string, options) {
    return this.createUrlFrom([source], options);
  }

  createUrlFrom(blobParts: BlobPart[], options) {
    let blob = this.createBlobFrom(blobParts, options);
    let url = URL.createObjectURL(blob);
    this.urls.push(url);
    return url;
  }

  createBlobFrom(blobParts: BlobPart[], options) {
    let blob = new Blob(blobParts, options);
    this.blobs.push(blob);
    return blob;
  }

  destruct() {
    this.urls.forEach(URL.revokeObjectURL);
  }
}

export function useBlobHandler(component, dependencies = []) {
  const [handler, setHandler] = useState(null);

  useEffect(() => {
    setHandler(new BlobHandler(component));

    return () => {
      handler?.destruct();
    };
  }, dependencies);

  return handler;
}
