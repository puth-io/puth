import {action, makeAutoObservable} from 'mobx';
import Events from '../Events';
import {IContext, ICommand} from '../Types';

export type SnapshotState = 'before'|'after';

// do not put this inside PreviewStoreClass because this must not be observed
let _lastActiveScreencastUrl: string|null = null;

class PreviewStore {
    private _activeContext: IContext|undefined;
    private _activeCommand: ICommand|undefined;
    activeState: SnapshotState = 'before';
    highlightCommand: ICommand|undefined;
    highlightState: SnapshotState = 'after';
    highlightScreencast: any = null;
    private highlightInterval: number|undefined;
    _darken: boolean = false;
    
    constructor() {
        makeAutoObservable(this);
        
        this.registerEvents();
        
        this._darken = localStorage.getItem('previewStore.darken') === 'true';
    }
    
    clear() {
        this.highlightCommand = undefined;
        this.activeCommand = undefined;
        this.activeContext = undefined;
    }
    
    set darken(value) {
        this._darken = value;
        localStorage.setItem('previewStore.darken', value ? 'true' : 'false');
    }
    
    get darken() {
        return this._darken;
    }
    
    resetHighlightInterval() {
        clearInterval(this.highlightInterval);
        // this.highlightInterval = window.setInterval(() => this.toggleHighlightState(), 1250);
        this.highlightState = 'after';
    }
    
    toggleHighlightState() {
        this.highlightState = this.highlightState === 'before' ? 'after' : 'before';
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
        this.activeContext = command?.context;
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
    
    activeScreencast: any = null;
    
    get visibleScreencast() {
        return this.highlightScreencast ?? this.activeScreencast;
    }
    
    get activeScreencastUrl() {
        if (! this.visibleScreencast) {
            return null;
        }
        
        if (_lastActiveScreencastUrl) {
            URL.revokeObjectURL(_lastActiveScreencastUrl);
        }
        
        _lastActiveScreencastUrl = URL.createObjectURL(new Blob([this.visibleScreencast.frame], {type: 'image/jpeg'}));
        return _lastActiveScreencastUrl;
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
        console.log('last until', this.findLastEventUntil(start, events));
        return rv;
    }
    
    findLastScreencastForCommand(command: any) {
        // calculate last frame before next command or if null, get overall last frame
        console.log(command.context.screencasts);
        let idx = command.context.commands.indexOf(command);
        if (idx === (command.context.commands.length - 1)) {
            console.log('returning last screencast');
            return {
                screencast: command.context.screencasts[command.context.screencasts.length - 1],
                until: command.timestamp,
            };
        } else {
            let until = command.context.commands[idx + 1].time.started;
            console.log('between', this.findEventsBetween(command.time.started, until, command.context.screencasts));
            return {
                screencast: this.findLastEventUntil(until, command.context.screencasts),
                until,
            };
        }
    }
    
    private registerEvents() {
        // @ts-ignore
        Events.on(
            'preview:toggle',
            action((cmd: ICommand|undefined) => {
                if (this.activeCommand?.id === cmd?.id) {
                    this.activeCommand = undefined;
                    
                    Events.emit('command:active', undefined);
                    
                    return;
                }
                
                if (this.highlightCommand?.id === cmd?.id) {
                    this.highlightCommand = undefined;
                }
                
                this.activeCommand = cmd;
                this.activeState = 'before';
                
                // calculate last frame before next command or if null, get overall last frame
                let lastScreencast = this.findLastScreencastForCommand(cmd);
                this.activeScreencast = lastScreencast.screencast;
                
                Events.emit('command:active', cmd);
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
