import {type ICommand, type ICommandError, type IPacket} from '@puth/core';
import { BaseHandler } from './BaseHandler';
import type Context from '../Context';
import type {Page} from 'puppeteer-core';
import {createHash} from 'node:crypto';

export class SnapshotHandler extends BaseHandler {
    #cache = new Map<Context, IPacket[]>();
    #responseContentByHash = new Map<Context, Map<string, string>>();

    pushToCache(context: Context, item, {broadcast} = {broadcast: true}) {
        if (item == null || item.cached) {
            return;
        }
        
        if (! this.#cache.has(context)) {
            // cleanup cache to have at least some memory limit
            if (this.#cache.size >= 100) {
                const oldestContext = this.#cache.keys().next().value;
                if (oldestContext !== undefined) {
                    this.#cache.delete(oldestContext);
                    this.#responseContentByHash.delete(oldestContext);
                }
            }
            
            this.#cache.set(context, []);
            this.#responseContentByHash.set(context, new Map());
        }

        this.deduplicateResponseContent(context, item);
        
        // @ts-ignore
        this.#cache.get(context).push(item);
        item.cached = true;
        
        // TODO maybe implement a time buffer to send out multiple snapshots
        if (broadcast) {
            this.puth.websocketHandler.broadcast(item);
        }
    }
    
    error(param: Context, page: Page, command: ICommand|undefined, error: ICommandError) {
        if (! command) {
            return;
        }
        
        command.errors.push(error);
    }
    
    getAllCachedItems() {
        // @ts-ignore
        return [].concat(...this.#cache.values());
    }
    
    getAllCachedItemsFrom(context: Context): IPacket[] {
        if (! this.#cache.has(context)) {
            return [];
        }
        
        // @ts-ignore
        return [].concat(...this.#cache.get(context));
    }
    
    hasCachedItems() {
        return this.#cache.size !== 0;
    }

    private deduplicateResponseContent(context: Context, item: any): void {
        if (item.type !== 'response' || ! (item.content instanceof Uint8Array)) {
            return;
        }

        const content = item.content;
        const contentHash = createHash('sha256').update(content).digest('hex');
        const responseContentByHash = this.#responseContentByHash.get(context)!;
        const contentReference = responseContentByHash.get(contentHash);

        item.contentHash = contentHash;
        item.contentLength = content.byteLength;

        if (contentReference !== undefined) {
            item.contentReference = contentReference;
            delete item.content;
            return;
        }

        responseContentByHash.set(contentHash, item.id);
    }
}
