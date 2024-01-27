import Context from './Context';
import {Page} from 'puppeteer-core';
import WebsocketConnections from './WebsocketConnections';
import {ICommand, ICommandError, IPacket} from '@puth/core/src/Types';

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
            this.broadcast(item);
        }
    }
    
    async createBefore(context: Context, page: Page, command: ICommand|undefined) {
        if (! command) {
            return;
        }
        
        // TODO move this into createAfter function?
        this.pushToCache(context, command, {broadcast: false});
    }
    
    async createAfter(context: Context, page: Page, command: ICommand|undefined) {
        if (! command) {
            return;
        }
        
        this.pushToCache(context, command, {broadcast: false});
        this.broadcast(command);
    }
    
    error(param: Context, page: Page, command: ICommand|undefined, error: ICommandError) {
        if (! command) {
            return;
        }
        
        command.errors.push(error);
    }
    
    broadcast(object: IPacket) {
        WebsocketConnections.broadcastAll(object);
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
