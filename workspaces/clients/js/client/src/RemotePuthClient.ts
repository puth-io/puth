import axios from 'axios';
import {RemoteContext} from './RemoteObject';

export class RemotePuthClient {
    private readonly externalUri: string;
    private axios: any;
    private options: any;
    private assertionHandler: ((assertion) => any)|undefined;
    
    constructor(externalUri, options?) {
        this.externalUri = externalUri;
        this.axios = axios.create({
            baseURL: externalUri,
        });
        this.options = options;
    }
    
    setAssertionHandler(assertionHandler: (assertion) => any) {
        this.assertionHandler = assertionHandler;
    }
    
    getAssertionHandler() {
        return this.assertionHandler;
    }
    
    async contextCreate(options = {}) {
        let response = await this.axios
            .post('/context', options)
            .then((r) => r.data)
            .catch(err => {
                throw err;
            });
        return new RemoteContext(this, response, {debug: this.options?.debug});
    }
    
    async contextCall(rpcPacket) {
        return await this.axios
            .patch('/context/call', rpcPacket)
            .then((r) => r.data);
    }
    
    async contextGet(rpcPacket) {
        return await this.axios
            .patch('/context/get', rpcPacket)
            .then((r) => r.data);
    }
    
    async contextSet(rpcPacket) {
        return await this.axios
            .patch('/context/set', rpcPacket)
            .then((r) => r.data);
    }
    
    async contextDelete(rpcPacket) {
        return await this.axios
            .patch('/context/delete', rpcPacket)
            .then((r) => r.data);
    }
    
    async contextDestroy(rpcPacket) {
        return await this.axios
            .delete('/context', {data: rpcPacket})
            .then((r) => r.data);
    }
}
