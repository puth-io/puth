import {SocketStream} from '@fastify/websocket';
import {Encoder as BaseEncoder, Decoder as BaseDecoder, ExtensionCodec} from '@msgpack/msgpack';

export const PUTH_EXTENSION_CODEC = new ExtensionCodec();

PUTH_EXTENSION_CODEC.register({
    type: 0,
    encode: (object: unknown): Uint8Array|null => {
        if (object instanceof Function) {
            return new TextEncoder().encode((object as () => void).toString());
        } else {
            return null;
        }
    },
    decode: (data: Uint8Array) => {
        return new TextDecoder().decode(data);
    },
});

export const Encoder = new BaseEncoder(PUTH_EXTENSION_CODEC);
export const Decoder = new BaseDecoder(PUTH_EXTENSION_CODEC);

class WebsocketConnectionHandler {
    sockets: SocketStream[] = [];
    
    push(socket: SocketStream) {
        this.sockets.push(socket);
    }
    
    pop(socket: SocketStream) {
        let index = this.sockets.indexOf(socket);
        this.sockets.splice(index, 1);
    }
    
    broadcastAll(message: string|object|object[]) {
        let data = this.serializeSharedRef(message);
        
        for (let socket of this.sockets) {
            socket.socket.send(data);
        }
    }
    
    serialize(object: string|object|object[]) {
        if (typeof object === 'object' || Array.isArray(object)) {
            return Encoder.encode(object);
        }
        
        throw Error('Unsupported serialization type');
    }
    
    serializeSharedRef(object: string|object|object[]) {
        if (typeof object === 'object' || Array.isArray(object)) {
            return Encoder.encodeSharedRef(object);
        }
        
        throw Error('Unsupported serialization type');
    }
    
    decode(data) {
        return Decoder.decode(data);
    }
}

const WebsocketConnections = new WebsocketConnectionHandler();

export default WebsocketConnections;


