import {action, makeAutoObservable} from 'mobx';
import Events from '../Events';
import ContextStore from "@/app/store/ContextStore.tsx";
import {ICommand} from "../Types.ts";
import {SnapshotState} from '@puth/core/src/Types'

// do not put this inside PreviewStoreClass because this must not be observed
let _lastActiveScreencastUrl: string|null = null;

class PreviewStore {
    private _activeContext: ContextStore|undefined;
    private _activeCommand: ICommand|undefined;
    activeState: SnapshotState = SnapshotState.BEFORE;
    highlightCommand: ICommand|undefined;
    highlightState: SnapshotState = SnapshotState.AFTER;
    highlightScreencast: any = null;
    private highlightInterval: number|undefined;
    _darken: boolean = false;
    
    screencast: {
        lastFrameBeforeSector: any,
        inBetween: any[],
        mode: 'replay'|SnapshotState.BEFORE|SnapshotState.AFTER,
        replayTime: number,
        minReplayTime: number,
        maxReplayTime: number,
        timePerFrame: number,
        replaying: boolean,
        rerunDelay: number,
        rerunTime: number,
    } = {
        lastFrameBeforeSector: null,
        inBetween: [],
        mode: 'replay',
        replayTime: 0,
        minReplayTime: 0,
        maxReplayTime: 0,
        timePerFrame: 1000 / 30,
        replaying: true,
        rerunDelay: 750,
        rerunTime: 0,
    };
    
    constructor() {
        makeAutoObservable(this);
        
        this.registerEvents();
        
        this._darken = localStorage.getItem('previewStore.darken') === 'true';
        
        setInterval(action(() => {
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
        }), this.screencast.timePerFrame);
    }
    
    get activeScreencast() {
        if (this.screencast.mode === 'replay') {
            // TODO only use lastFrameBeforeSector if its in a certain time window to "smoothen" the replay
            return this.findLastEventUntil(this.screencast.replayTime, this.screencast.inBetween) ?? this.screencast.lastFrameBeforeSector;
        }
        if (this.screencast.mode === SnapshotState.AFTER) {
            if (this.screencast.inBetween.length > 0) {
                return this.screencast.inBetween[this.screencast.inBetween.length - 1];
            }
        }
        if (this.screencast.mode === SnapshotState.BEFORE) {
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
        localStorage.setItem('previewStore.darken', value ? 'true' : 'false');
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
    
    private registerEvents() {
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
                
                this.screencast.minReplayTime = this.screencast.inBetween[0]?.timestamp;
                this.screencast.replayTime = this.screencast.minReplayTime;
                this.screencast.maxReplayTime = this.screencast.inBetween[this.screencast.inBetween.length - 1]?.timestamp;
                this.screencast.replaying = true;
                this.screencast.rerunTime = 0;
                
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
