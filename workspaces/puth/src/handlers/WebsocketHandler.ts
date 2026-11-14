import { BaseHandler } from './BaseHandler';
import {Encoder as BaseEncoder, Decoder as BaseDecoder, ExtensionCodec} from '@msgpack/msgpack';
import { type Peer } from 'crossws';
import { compressSync } from '../utils/Compression';

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

// Large packets, like keyframes and resources, are compressed if that saves at least a tenth; frames rarely do.
const COMPRESS_FROM = 16 * 1024;

export class WebsocketHandler extends BaseHandler {
    peers: Peer[] = [];
    // Peers that don't have the recordings yet get what is broadcast meanwhile afterwards, in order.
    private waiting = new Map<Peer, Uint8Array[]>();

    push(peer: Peer) {
        this.logger.debug('WebsocketHandler peer connected');
        this.peers.push(peer);
        this.waiting.set(peer, []);
    }

    ready(peer: Peer, recordings?: Uint8Array) {
        const queued = this.waiting.get(peer);
        this.waiting.delete(peer);
        if (queued === undefined || ! this.peers.includes(peer)) {
            return;
        }
        try {
            if (recordings !== undefined) {
                peer.send(recordings);
            }
            queued.forEach(data => peer.send(data));
        } catch (error) {
            this.logger.debug({error}, 'Could not send to a websocket client');
        }
    }

    pop(peer: Peer) {
        this.logger.debug('WebsocketHandler peer disconnected');
        let index = this.peers.indexOf(peer);
        this.peers.splice(index, 1);
        this.waiting.delete(peer);
    }

    broadcast(message: string|object|object[], encoded?: Uint8Array) {
        let data = encoded ?? this.serializeSharedRef(message);
        if (data.byteLength >= COMPRESS_FROM) {
            const compressed = compressSync(data);
            if (compressed.byteLength < data.byteLength * 0.9) {
                data = compressed;
            }
        }

        for (let peer of this.peers) {
            const queue = this.waiting.get(peer);
            if (queue !== undefined) {
                // A shared encoding is overwritten by the next one.
                queue.push(data.slice());
            } else {
                peer.send(data);
            }
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
