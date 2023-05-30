import { ICommand } from '../Components/Command/Command';
import { action, makeAutoObservable } from 'mobx';
import { BlobHandler, recover } from '../Misc/SnapshotRecovering';
import Events from '../../Events';
import { IContext } from '../Misc/WebsocketHandler';
import { resolveSnapshotBacktrack3, resolveSnapshotBacktrackV4 } from '../Misc/Util';

export type SnapshotState = 'before' | 'after';
export type HighlightType = 'screencast' | 'dom';
export type Actor = 'sidebar' | 'timeline';

export const domParser = new DOMParser();

class PreviewStoreClass {
  private _activeContext: IContext | undefined;
  private _activeCommand: ICommand | undefined;
  activeState: SnapshotState = 'before';
  highlightCommand: ICommand | undefined;
  highlightState: SnapshotState = 'after';
  private highlightInterval: number | undefined;
  _darken: boolean = false;
  _removeScriptTags: boolean = true;
  visibleHighlightType: HighlightType = 'screencast';
  highlightScreencast: any = null;

  constructor() {
    makeAutoObservable(this);

    this.registerEvents();

    this._darken = localStorage.getItem('previewStore.darken') === 'true';
    let lsRemoveScriptTags = localStorage.getItem('previewStore.removeScriptTags');
    this._removeScriptTags = lsRemoveScriptTags ? lsRemoveScriptTags === 'true' : true;
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

  set removeScriptTags(value) {
    this._removeScriptTags = value;
    localStorage.setItem('previewStore.removeScriptTags', value ? 'true' : 'false');
  }

  get removeScriptTags() {
    return this._removeScriptTags;
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
    if (!this.visibleCommand?.snapshots?.before) {
      return 'after';
    }
    if (!this.visibleCommand?.snapshots?.after) {
      return 'before';
    }
    return this.highlightCommand ? this.highlightState : this.activeState;
  }

  get visibleSnapshot() {
    if (this.visibleHighlightType !== 'dom') {
      return null;
    }
    return this.visibleCommand?.snapshots[this.visibleHighlightState];
  }

  get visibleSnapshotSource() {
    if (!this.hasVisibleSnapshotSource || !this.visibleSnapshot) {
      return;
    }

    BlobHandler.cleanup();

    let html = '';

    if (this.visibleSnapshot?.version === 4) {
      let context = this.visibleCommand?.context;
      let commands = context?.commands.filter((i) => i.type === 'command');
      let index = commands?.findIndex((i) => i.id === this.visibleCommand?.id);

      html = resolveSnapshotBacktrackV4(commands, index, this.visibleHighlightState === 'before');
    } else if (this.visibleSnapshot?.version === 3) {
      let context = this.visibleCommand?.context;
      let commands = context?.commands.filter((i) => i.type === 'command');
      let index = commands?.findIndex((i) => i.id === this.visibleCommand?.id);

      html = resolveSnapshotBacktrack3(commands, index, this.visibleHighlightState === 'after');
    } else if (this.visibleSnapshot?.version === 2) {
      html = this.visibleSnapshot?.html?.src;
    }

    const parsedDocument = domParser.parseFromString(html, 'text/html');
    recover(this.visibleCommand, this.visibleSnapshot, parsedDocument);

    // TODO find a way to make Blob out of document directly because this is "document => string => blob"
    //      but if innerHTML is cached then it doesn't that big of a difference
    let { url } = BlobHandler.createUrlFromString(parsedDocument.documentElement.innerHTML, { type: 'text/html' });
    return url;
  }

  get hasVisibleSnapshotSource() {
    return true;
  }

  get visibleHasBefore() {
    return this.visibleCommand?.snapshots && 'before' in this.visibleCommand.snapshots;
  }

  get visibleHasAfter() {
    return this.visibleCommand?.snapshots && 'after' in this.visibleCommand.snapshots;
  }

  get visibleHasSnapshots() {
    return Array.isArray(this.visibleCommand?.snapshots);
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
  
  // set activeScreencast(screencast) {
  //  
  // }
  
  activeScreencast: any = null;
  
  get visibleScreencast() {
    return this.highlightScreencast ?? this.activeScreencast;
  }
  
  get activeScreencastUrl() {
    if (this.visibleHighlightType !== 'screencast' || !this.visibleScreencast) {
      return null;
    }
    
    // if (this._activeScreencastUrl) {
    //   URL.revokeObjectURL(this._activeScreencastUrl);
    // }
    // this._activeScreencastUrl = URL.createObjectURL(new Blob([this.activeScreencast.frame], {type: 'image/jpg'}));
    
    // return this._activeScreencastUrl;
    
    return URL.createObjectURL(new Blob([this.visibleScreencast.frame], {type: 'image/jpg'}));
  }
  
  private _timelineCursor: number|null = null;
  timelineHighlightCursor = null;
  
  get timelineCursor() {
    return this.timelineHighlightCursor ?? this._timelineCursor;
  }
  set timelineCursor(value: number|null) {
    this._timelineCursor = value;
  }
  
  get timelineCursorPercentage() {
    if (!this.timelineCursor) {
      return 0;
    }
    
    const percentageFromLeft = (time: number) => (time - this.timelineData?.start) / this.timelineData?.diff;
    return percentageFromLeft(this.timelineCursor);
  }
  
  get timelineData() {
    if (!this.visibleCommand) {
      return {
        screencasts: [],
        commands: [],
        exceptions: [],
      };
    }
    
    let context = this.visibleCommand.context;
    
    let start = context.createdAt;
    let end = context.lastActivity;
    let diff = end - start;
    
    const percentageFromLeft = (time: number) => (time - start) / diff;
    
    let screencasts = context.screencasts.map((event: any) => [percentageFromLeft(event.timestamp), event]);
    let commands = context.commands.map((event: any) => [percentageFromLeft(event.timestamp), event]);
    let exceptions = context.exceptions.map((event: any) => [percentageFromLeft(event.timestamp), event]);
    
    return {
      screencasts,
      commands,
      exceptions,
      start,
      end,
      diff,
    }
  }
  
  findLastEventUntil(time, events) {
    let last;
    for (let screencast of events) {
      if (screencast.timestamp > time) {
        break;
      }
      last = screencast;
    }
    return last;
  }
  
  findLastScreencastForCommand(command) {
    // calculate last frame before next command or if null, get overall last frame
    let idx = command.context.commands.indexOf(command);
    if (idx === (command.context.commands.length - 1)) {
      return {
        screencast: command.context.screencasts[command.context.screencasts.length -1],
        until: command.timestamp,
      };
    } else {
      let until = command.context.commands[idx + 1].timestamp - 1;
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
      action((cmd: ICommand | undefined) => {
        if (this.activeCommand?.id === cmd?.id) {
          this.activeCommand = undefined;
          this.activeScreencast = undefined;

          Events.emit('command:active', undefined);

          return;
        }

        if (this.highlightCommand?.id === cmd?.id) {
          this.highlightCommand = undefined;
        }
        
        this.activeCommand = cmd;
        this.activeState = 'after';
        
        // calculate last frame before next command or if null, get overall last frame
        let lastScreencast = this.findLastScreencastForCommand(cmd);
        this.activeScreencast = lastScreencast.screencast;
        this.timelineCursor = lastScreencast.until;
        
        Events.emit('command:active', cmd);
      }),
    );
    // @ts-ignore
    Events.on(
      'preview:highlight:show',
      action((cmd: ICommand | undefined) => {
        if (this.visibleCommand?.id === cmd?.id) {
          return;
        }
        this.highlightCommand = cmd;
        this.resetHighlightInterval();
        
        // calculate last frame before next command or if null, get overall last frame
        let lastScreencast = this.findLastScreencastForCommand(cmd);
        this.highlightScreencast = lastScreencast.screencast;
        this.timelineHighlightCursor = lastScreencast.until;
      }),
    );
    // @ts-ignore
    Events.on(
      'preview:highlight:hide',
      action((cmd: ICommand | undefined) => {
        if (this.highlightCommand?.id === cmd?.id) {
          this.highlightCommand = undefined;
          this.highlightScreencast = null;
          this.timelineHighlightCursor = null;
        }
      }),
    );
  }
}

/**
 * Global objects initialization
 */
const PreviewStore = new PreviewStoreClass();

export default PreviewStore;