import {action, computed, makeObservable, observable} from 'mobx';
import Events from '../Events';
import {ICommand, SnapshotMode, SnapshotState} from '@puth/core/src/Types';
import ContextStore from '@/app/store/ContextStore';

class PreviewStore {
    context: ContextStore;
    
    _activeContext: ContextStore|undefined;
    _activeCommand: ICommand|undefined;
    _highlightCommand: ICommand|undefined;
    highlightState: SnapshotState = SnapshotState.AFTER;
    highlightScreencast: any = null;
    highlightInterval: number|undefined;
    _darken: boolean = false;
    
    screencast: {
        lastFrameBeforeSector: any,
        inBetween: any[],
    } = {
        lastFrameBeforeSector: null,
        inBetween: [],
    };
    
    defaults = {
        highlightCommandState: SnapshotState.AFTER,
    };
    
    _mode: SnapshotMode = SnapshotMode.FRAME;
    _state: SnapshotState = SnapshotState.AFTER;
    
    _lastActiveScreencastUrl: string|null = null;
    
    constructor(context: ContextStore) {
        this.context = context;
        
        makeObservable(this, {
            _activeContext: observable,
            _activeCommand: observable,
            _highlightCommand: observable,
            highlightState: observable,
            highlightScreencast: observable,
            highlightInterval: observable,
            _darken: observable,
            screencast: observable,
            _mode: observable,
            _state: observable,
            
            clear: action,
            resetHighlightInterval: action,
            toggleHighlightState: action,
            findLastEventUntil: action,
            findEventsBetween: action,
            findLastScreencastForCommand: action,
            registerEvents: action,
            toggleCommand: action,
            highlightCommand: action,
            unhighlightCommand: action,
            
            activeScreencast: computed,
            visibleScreencast: computed,
            activeScreencastUrl: computed,
            // darken: computed,
            visibleCommand: computed,
            visibleHighlightState: computed,
            isVisibleHighlight: computed,
            // activeCommand: computed,
            // activeContext: computed,
            mode: computed,
            state: computed,
        });
        
        this.registerEvents();
    }
    
    get mode() {
        return this._mode;
    }
    
    set mode(mode: SnapshotMode) {
        this._mode = mode;
    }
    
    get state() {
        return this._state;
    }
    
    set state(state: SnapshotState) {
        this._state = state;
    }
    
    get activeScreencast() {
        if (this.state === SnapshotState.AFTER) {
            if (this.screencast.inBetween.length > 0) {
                return this.screencast.inBetween[this.screencast.inBetween.length - 1];
            }
        }
        if (this.state === SnapshotState.BEFORE) {
            return this.screencast.lastFrameBeforeSector;
        }
        
        return this.screencast.lastFrameBeforeSector;
    }
    
    get visibleScreencast() {
        return this._highlightCommand ? this.highlightScreencast : this.activeScreencast;
    }
    
    get activeScreencastUrl() {
        if (this._lastActiveScreencastUrl) {
            URL.revokeObjectURL(this._lastActiveScreencastUrl);
        }
        
        if (! this.visibleScreencast) {
            return null;
        }
        
        this._lastActiveScreencastUrl = URL.createObjectURL(new Blob([this.visibleScreencast.frame], {type: 'image/jpeg'}));
        return this._lastActiveScreencastUrl;
    }
    
    clear() {
        this._highlightCommand = undefined;
        this.highlightScreencast = undefined;
        this.highlightState = SnapshotState.AFTER;
        this._activeCommand = undefined;
        this._activeContext = undefined;
        this.screencast.lastFrameBeforeSector = null;
        this.screencast.inBetween = [];
        
        if (this._lastActiveScreencastUrl !== null) {
            // @ts-ignore
            URL.revokeObjectURL(this._lastActiveScreencastUrl);
            this._lastActiveScreencastUrl = null;
        }
    }
    
    set darken(value) {
        this._darken = value;
    }
    
    get darken() {
        return this._darken;
    }
    
    resetHighlightInterval() {
        clearInterval(this.highlightInterval);
        // this.highlightInterval = window.setInterval(() => this.toggleHighlightState(), 1250);
        this.highlightState = SnapshotState.AFTER;
    }
    
    toggleHighlightState() {
        this.highlightState = this.highlightState === SnapshotState.BEFORE ? SnapshotState.AFTER : SnapshotState.BEFORE;
    }
    
    get visibleCommand() {
        return this._highlightCommand ?? this.activeCommand;
    }
    
    get visibleHighlightState() {
        return this._highlightCommand ? this.defaults.highlightCommandState : this.state;
    }
    
    get isVisibleHighlight() {
        return this._highlightCommand !== undefined;
    }
    
    set activeCommand(command: TODO) {
        if (command) {
            this.activeContext = command.context;
        }
        this._activeCommand = command;
    }
    
    get activeCommand() {
        return this._activeCommand;
    }
    
    set activeContext(context) {
        this._activeContext = context;
    }
    
    get activeContext() {
        return this._activeContext;
    }
    
    findLastEventUntil(time: number, events: any) {
        let last = null;
        for (let screencast of events) {
            if (screencast.timestamp >= time) {
                break;
            }
            last = screencast;
        }
        return last;
    }
    
    findEventsBetween(start: number, end: number, events: any) {
        let rv: any[] = [];
        for (let screencast of events) {
            if (screencast.timestamp > start && screencast.timestamp < end) {
                rv.push(screencast);
            }
        }
        return rv;
    }
    
    findLastScreencastForCommand(command: any) {
        // calculate last frame before next command or if null, get overall last frame
        let idx = command.context.commands.findIndex((item: any) => command.id === item.id);
        if (idx === (command.context.commands.length - 1)) {
            return {
                screencast: command.context.screencasts[command.context.screencasts.length - 1],
                until: command.timestamp,
            };
        } else {
            let until = command.context.commands[idx + 1].time.started;
            return {
                screencast: this.findLastEventUntil(until, command.context.screencasts),
                until,
            };
        }
    }
    
    public toggleCommand(command: ICommand) {
        if (this.activeCommand?.id === command?.id) {
            this.activeCommand = undefined;
            this.screencast.lastFrameBeforeSector = undefined;
            this.screencast.inBetween = [];
            
            Events.emit('command:active', undefined);
            
            return;
        }
        
        if (this._highlightCommand?.id === command?.id) {
            this._highlightCommand = undefined;
            this.highlightScreencast = null;
        }
        
        this.activeCommand = command;
        
        let idx = (command.context as TODO).commands.findIndex((item: any) => command.id === item.id);
        // if (idx !== 0) { // find last frame before inBetween sector to display as entry point
        //     this.screencast.lastFrameBeforeSector = this.findLastScreencastForCommand(command.context.commands[idx - 1]).screencast;
        // }
        let until = idx === ((command.context as TODO).commands.length - 1) ? (command.time.finished + 1) : (command.context as TODO).commands[idx + 1].time.started;
        this.screencast.inBetween = this.findEventsBetween(command.time.started, until, (command.context as TODO).screencasts);
        
        // find last frame before inBetween sector to display as entry point
        this.screencast.lastFrameBeforeSector = this.findLastEventUntil(command.time.started, (command.context as TODO).screencasts);
        
        Events.emit('command:active', command as TODO);
    }
    
    public highlightCommand(command: ICommand|undefined) {
        if (this.visibleCommand?.id === command?.id) {
            return;
        }
        if (this.activeCommand?.id === command?.id) {
            return;
        }
        this._highlightCommand = command;
        this.resetHighlightInterval();
        
        // calculate last frame before next command or if null, get overall last frame
        let lastScreencast = this.findLastScreencastForCommand(command);
        this.highlightScreencast = lastScreencast.screencast;
        console.debug('[Preview] highlightCommand', command, lastScreencast);
    }

    public unhighlightCommand(command: ICommand|undefined) {
        if (this._highlightCommand?.id !== command?.id) {
            return;
        }
        
        console.debug('[Preview] unhighlightCommand', command);
        this._highlightCommand = undefined;
        this.highlightScreencast = null;
    }
    
    registerEvents() {
        // // @ts-ignore
        // Events.on('preview:toggle', command => this.toggleCommand(command));
        // // @ts-ignore
        // Events.on('preview:highlight:show', cmd => this.highlightCommand(cmd));
        // // @ts-ignore
        // Events.on('preview:highlight:hide', cmd => this.unhighlightCommand(cmd));
    }
}

export default PreviewStore;
