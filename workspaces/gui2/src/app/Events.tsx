import mitt, {Emitter} from 'mitt';
import ContextStore from "@/app/overwrites/store/ContextStore.tsx";
import {ICommand} from './Types';

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
};

const Events: Emitter<Events> = mitt<Events>();

export default Events;
