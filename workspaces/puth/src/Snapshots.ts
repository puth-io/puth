import {Page} from 'puppeteer-core';
import WebsocketConnections from './WebsocketConnections';
import {ICommand, ICommandError, IPacket} from '@puth/core';
import Context from './Context';

class SnapshotHandler {
    private cache = new Map<Context, IPacket[]>();
    
    pushToCache(context: Context, item, {broadcast} = {broadcast: true}) {
        if (item.cached) {
            return;
        }
        
        if (! this.cache.has(context)) {
            // cleanup cache to have at least some memory limit
            if (this.cache.size >= 100) {
                this.cache.delete(this.cache.keys()[0]);
            }
            
            this.cache.set(context, []);
        }
        
        // @ts-ignore
        this.cache.get(context).push(item);
        item.cached = true;
        
        // TODO maybe implement a time buffer to send out multiple snapshots
        if (broadcast) {
            WebsocketConnections.broadcastAll(item);
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
        return [].concat(...this.cache.values());
    }
    
    getAllCachedItemsFrom(context: Context): IPacket[] {
        if (! this.cache.has(context)) {
            return [];
        }
        
        // @ts-ignore
        return [].concat(...this.cache.get(context));
    }
    
    hasCachedItems() {
        return this.cache.size !== 0;
    }
}

const Snapshots = new SnapshotHandler();

export default Snapshots;
