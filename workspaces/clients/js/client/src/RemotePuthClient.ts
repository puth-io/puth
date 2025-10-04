import {RemoteContext} from './Remote';
import path from 'node:path';

const catchBrokenPipe = (error) => {
    if (error instanceof SyntaxError && error.message.includes('Unexpected end of JSON input')) {
        return Promise.resolve();
    }
    throw error;
};

export class RemotePuthClient {
    private readonly externalUri: string;
    private options: any;
    private assertionHandler: ((assertion) => any)|undefined;
    
    constructor(externalUri, options?) {
        this.externalUri = externalUri;
        this.options = options;
    }
    
    setAssertionHandler(assertionHandler: (assertion) => any) {
        this.assertionHandler = assertionHandler;
    }
    
    getAssertionHandler() {
        return this.assertionHandler;
    }
    
    async contextCreate(options = {}) {
        let response = await this.request('POST', '/context', options)
            .then(res => res.json())
            .catch(catchBrokenPipe);
        
        return new RemoteContext(this, response, {debug: this.options?.debug});
    }
    
    async contextCall(rpcPacket) {
        return await this.request('PATCH', '/context/call', rpcPacket)
            .then(res => res.json())
            .catch(catchBrokenPipe);
    }
    
    async contextGet(rpcPacket) {
        return await this.request('PATCH', '/context/get', rpcPacket)
            .then(res => res.json())
            .catch(catchBrokenPipe);
    }
    
    async contextSet(rpcPacket) {
        return await this.request('PATCH', '/context/set', rpcPacket)
            .then(res => res.json())
            .catch(catchBrokenPipe);
    }
    
    async contextDelete(rpcPacket) {
        return await this.request('PATCH', '/context/delete', rpcPacket)
            .then(res => res.json())
            .catch(catchBrokenPipe);
    }
    
    async contextDestroy(rpcPacket) {
        return await this.request('DELETE', '/context', rpcPacket)
            .then(res => res.text())
            .catch(catchBrokenPipe);
    }
    
    request(method, url, data = {}) {
        return fetch(path.join(this.externalUri, url), {
            method: method,
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(async response => {
                if (! response.ok) {
                    console.log(method, url, data);
                    console.error(await response.text());
                    throw new Error(`Request failed. Status: ${response.status}`);
                }
                return response;
            });
    }
}
