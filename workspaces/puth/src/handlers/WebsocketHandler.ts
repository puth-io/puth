import { BaseHandler } from './BaseHandler';
import {Encoder as BaseEncoder, Decoder as BaseDecoder, ExtensionCodec} from '@msgpack/msgpack';
import { type Peer } from 'crossws';

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

export class WebsocketHandler extends BaseHandler {
    peers: Peer[] = [];

    push(peer: Peer) {
        this.logger.debug('WebsocketHandler peer connected');
        this.peers.push(peer);
    }

    pop(peer: Peer) {
        this.logger.debug('WebsocketHandler peer disconnected');
        let index = this.peers.indexOf(peer);
        this.peers.splice(index, 1);
    }

    broadcast(message: string|object|object[]) {
        let data = this.serializeSharedRef(message);

        for (let peer of this.peers) {
            peer.send(data);
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
