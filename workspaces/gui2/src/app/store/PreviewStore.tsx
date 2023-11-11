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
    
    screencast: {
        inBetween: any[],
        mode: 'replay'|'before'|'after',
        replayTime: number,
        minReplayTime: number,
        maxReplayTime: number,
        timePerFrame: number,
        replaying: boolean,
        rerunDelay: number,
        rerunTime: number,
    } = {
        inBetween: [],
        mode: 'replay',
        replayTime: 0,
        minReplayTime: 0,
        maxReplayTime: 0,
        timePerFrame: 1000 / 30,
        replaying: true,
        rerunDelay: 500,
        rerunTime: 0,
    };
    
    constructor() {
        makeAutoObservable(this);
        
        this.registerEvents();
        
        this._darken = localStorage.getItem('previewStore.darken') === 'true';
        
        setInterval(() => {
            if (this.screencast.inBetween.length < 2) {
                return; // set replaceTime greater than the single frame in inBetween
            }
            
            if (this.screencast.replaying) {
                this.screencast.replayTime += this.screencast.timePerFrame;
                if (this.screencast.replayTime > this.screencast.maxReplayTime) {
                    this.screencast.replaying = false;
                }
            } else {
                this.screencast.rerunTime += this.screencast.timePerFrame;
                if (this.screencast.rerunTime > this.screencast.rerunDelay) {
                    this.screencast.rerunTime = 0;
                    this.screencast.replaying = true;
                    this.screencast.replayTime = this.screencast.minReplayTime;
                }
            }
        }, this.screencast.timePerFrame);
    }
    
    get visibleScreencast() {
        if (this.screencast.mode === 'replay') {
            return this.findLastEventUntil(this.screencast.replayTime, this.screencast.inBetween);
        }
        
        return this.highlightScreencast ?? this.activeScreencast;
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
    
    private registerEvents() {
        // @ts-ignore
        Events.on(
            'preview:toggle',
            action((command: ICommand) => {
                if (this.activeCommand?.id === command?.id) {
                    this.activeCommand = undefined;
                    this.screencast.inBetween = [];
                    
                    Events.emit('command:active', undefined);
                    
                    return;
                }
                
                if (this.highlightCommand?.id === command?.id) {
                    this.highlightCommand = undefined;
                }
                
                this.activeCommand = command;
                this.activeState = 'before';
                
                let idx = command.context.commands.indexOf(command);
                let until = idx === (command.context.commands.length - 1) ? (command.time.finished + 1) : command.context.commands[idx + 1].time.started;
                this.screencast.inBetween = [];
                // this.screencast.inBetween.push(this.findLastScreencastForCommand(command));
                this.screencast.inBetween.push(...this.findEventsBetween(command.time.started, until, command.context.screencasts));
                
                this.screencast.minReplayTime = this.screencast.inBetween[0].timestamp;
                this.screencast.replayTime = this.screencast.minReplayTime;
                this.screencast.maxReplayTime = this.screencast.inBetween[this.screencast.inBetween.length - 1].timestamp;
                
                // calculate last frame before next command or if null, get overall last frame
                let lastScreencast = this.findLastScreencastForCommand(command);
                this.activeScreencast = lastScreencast.screencast;
                
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
