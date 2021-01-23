import { SocketStream } from 'fastify-websocket';

class WebsocketConnectionHandler {
  sockets: SocketStream[] = [];

  push(socket: SocketStream) {
    this.sockets.push(socket);
  }

  pop(socket: SocketStream) {
    let index = this.sockets.indexOf(socket);
    this.sockets.splice(index, 1);
  }

  broadcastAll(message: string | object | object[]) {
    let data = this.serialize(message);

    for (let socket of this.sockets) {
      socket.socket.send(data);
    }
  }

  serialize(object: string | object | object[]) {
    if (typeof object === 'object' || Array.isArray(object)) {
      return JSON.stringify(object);
    }
    return object;
  }
}

const WebsocketConnections = new WebsocketConnectionHandler();

export default WebsocketConnections;
