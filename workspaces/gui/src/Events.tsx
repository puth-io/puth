import mitt, {Emitter} from 'mitt';
import {ICommand} from "./App/Components/Command/Command";
import ContextStore from "./App/Mobx/ContextStore";

type Events = {
    'preview:toggle': ICommand;
    'preview:highlight:show': ICommand;
    'preview:highlight:hide': ICommand;
    'command:active'?: ICommand;
    'layout:resize': undefined;
    'context:created': ContextStore;
    'context:received': {context: ContextStore, packet: any};
    'context:event': [ContextStore, any];
    'context:event:screencast': {context: ContextStore, packet: any};
    'rl': {url: string, requestId: number, serviceWorker: ServiceWorker};
};

const Events: Emitter<Events> = mitt<Events>();

const MessageType = {
    REQUEST: 1,
};
navigator.serviceWorker.onmessage = (event) => {
    if (event.data?.type === MessageType.REQUEST) {
        console.log('events', event);
        Events.emit('rl', {
            url: event.data.url,
            requestId: event.data.requestId,
            // @ts-ignore
            serviceWorker: event.source,
        })
    }
};

export default Events;

