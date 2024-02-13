import {action, computed, makeObservable, observable} from 'mobx';
import Events from '../Events';
import {ICommand, SnapshotMode, SnapshotState} from '@puth/core/src/Types';
import ContextStore from '@/app/store/ContextStore';

// do not put this inside PreviewStoreClass because this must not be observed
let _lastActiveScreencastUrl: string|null = null;

class PreviewStore {
    _activeContext: ContextStore|undefined;
    _activeCommand: ICommand|undefined;
    activeState: SnapshotState = SnapshotState.BEFORE;
    highlightCommand: ICommand|undefined;
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
    
    _mode: SnapshotMode = SnapshotMode.FRAME;
    _state: SnapshotState = SnapshotState.AFTER;
    
    constructor() {
        makeObservable(this, {
            _activeContext: observable,
            _activeCommand: observable,
            activeState: observable,
            highlightCommand: observable,
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
        return this.highlightScreencast ?? this.activeScreencast;
    }
    
    get activeScreencastUrl() {
        if (_lastActiveScreencastUrl) {
            URL.revokeObjectURL(_lastActiveScreencastUrl);
        }
        
        if (! this.visibleScreencast) {
            return null;
        }
        
        _lastActiveScreencastUrl = URL.createObjectURL(new Blob([this.visibleScreencast.frame], {type: 'image/jpeg'}));
        return _lastActiveScreencastUrl;
    }
    
    clear() {
        this.highlightCommand = undefined;
        this.activeCommand = undefined;
        this.activeContext = undefined;
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
        return this.highlightCommand ?? this.activeCommand;
    }
    
    get visibleHighlightState() {
        return this.highlightCommand ? this.highlightState : this.activeState;
    }
    
    get isVisibleHighlight() {
        return this.highlightCommand !== undefined;
    }
    
    set activeCommand(command) {
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
        let idx = command.context.commands.indexOf(command);
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
    
    registerEvents() {
        // @ts-ignore
        Events.on(
            'preview:toggle',
            action((command: ICommand) => {
                if (this.activeCommand?.id === command?.id) {
                    this.activeCommand = undefined;
                    this.screencast.lastFrameBeforeSector = undefined;
                    this.screencast.inBetween = [];
                    
                    Events.emit('command:active', undefined);
                    
                    return;
                }
                
                if (this.highlightCommand?.id === command?.id) {
                    this.highlightCommand = undefined;
                    this.highlightScreencast = null;
                }
                
                this.activeCommand = command;
                this.activeState = SnapshotState.BEFORE;
                
                let idx = command.context.commands.indexOf(command);
                // if (idx !== 0) { // find last frame before inBetween sector to display as entry point
                //     this.screencast.lastFrameBeforeSector = this.findLastScreencastForCommand(command.context.commands[idx - 1]).screencast;
                // }
                let until = idx === (command.context.commands.length - 1) ? (command.time.finished + 1) : command.context.commands[idx + 1].time.started;
                this.screencast.inBetween = this.findEventsBetween(command.time.started, until, command.context.screencasts);
                
                // find last frame before inBetween sector to display as entry point
                this.screencast.lastFrameBeforeSector = this.findLastEventUntil(command.time.started, command.context.screencasts);
                
                Events.emit('command:active', command);
            }),
        );
        // @ts-ignore
        Events.on(
            'preview:highlight:show',
            action((cmd: ICommand|undefined) => {
                if (this.visibleCommand?.id === cmd?.id) {
                    return;
                }
                this.highlightCommand = cmd;
                this.resetHighlightInterval();
                
                // calculate last frame before next command or if null, get overall last frame
                let lastScreencast = this.findLastScreencastForCommand(cmd);
                this.highlightScreencast = lastScreencast.screencast;
            }),
        );
        // @ts-ignore
        Events.on(
            'preview:highlight:hide',
            action((cmd: ICommand|undefined) => {
                if (this.highlightCommand?.id === cmd?.id) {
                    this.highlightCommand = undefined;
                    this.highlightScreencast = null;
                }
            }),
        );
    }
}

export default PreviewStore;
