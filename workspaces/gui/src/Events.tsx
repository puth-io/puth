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
};

const Events: Emitter<Events> = mitt<Events>();

export default Events;
