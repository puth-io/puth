export class BlobHandler {
  private urls: string[] = [];
  urlsUntracked: string[] = [];

  createUrlFromString(source: string, options: any) {
    return this.createUrlFrom([source], options);
  }

  createUrlFrom(blobParts: BlobPart[], options: { type?: string; track?: any }) {
    let { blob } = this.createBlobFrom(blobParts, options);
    let url = URL.createObjectURL(blob);

    if (options?.track !== false) {
      this.urls.push(url);
    } else {
      this.urlsUntracked.push(url);
    }

    return { url, blob, options };
  }

  createBlobFrom(blobParts: BlobPart[], options: BlobPropertyBag | undefined) {
    let blob = new Blob(blobParts, options);
    return { blob, options };
  }

  cleanup() {
    this.urls.forEach((url) => this.revoke(url));
    this.urls = [];
  }

  revoke(url: string) {
    return URL.revokeObjectURL(url);
  }
}
