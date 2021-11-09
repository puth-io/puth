import { useState, useEffect } from 'react';

export class BlobHandler {
  private blobs = [];
  private urls = [];

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

  cleanup() {
    this.urls.forEach((item) => URL.revokeObjectURL(item));
    this.blobs = [];
    this.urls = [];
  }
}
