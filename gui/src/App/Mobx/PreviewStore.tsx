import { ICommand } from '../Components/Command/Command';
import { action, makeAutoObservable } from 'mobx';
import { BlobHandler, recover } from '../Misc/SnapshotRecovering';
import { Events } from '../../index';
import { IContext } from '../Misc/WebsocketHandler';
import { resolveSnapshotBacktrack } from '../Misc/Util';

export type SnapshotState = 'before' | 'after';

export class PreviewStoreClass {
  private _activeContext: IContext | undefined;
  private _activeCommand: ICommand | undefined;
  activeState: SnapshotState = 'before';
  highlightCommand: ICommand | undefined;
  highlightState: SnapshotState = 'after';
  private highlightInterval: number;
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
    if (!this.visibleCommand?.snapshots?.before) {
      return 'after';
    }
    if (!this.visibleCommand?.snapshots?.after) {
      return 'before';
    }
    return this.highlightCommand ? this.highlightState : this.activeState;
  }

  get visibleSnapshot() {
    return this.visibleCommand?.snapshots[this.visibleHighlightState];
  }

  get visibleSnapshotSource() {
    if (!this.hasVisibleSnapshotSource || !this.visibleSnapshot) {
      return;
    }

    BlobHandler.cleanup();

    let html = '';

    if (this.visibleSnapshot?.version === 3) {
      let context = this.visibleCommand.context;
      let commands = context.commands.filter((i) => i.type === 'command');
      let index = commands.findIndex((i) => i.id === this.visibleCommand.id);

      html = resolveSnapshotBacktrack(commands, index, this.visibleHighlightState === 'after');
    } else if (this.visibleSnapshot?.version === 2) {
      html = this.visibleSnapshot?.html?.src;
    }

    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
    recover(this.visibleCommand, this.visibleSnapshot, parsedDocument);

    // TODO find a way to make Blob out of document directly because this is "document => string => blob"
    //      but if innerHTML is cached then it doesn't that big of a difference
    return BlobHandler.createUrlFromString(parsedDocument.documentElement.innerHTML, { type: 'text/html' });
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

  private registerEvents() {
    Events.on(
      'preview:toggle',
      action((cmd: ICommand | undefined) => {
        if (this.activeCommand?.id === cmd?.id) {
          this.activeCommand = undefined;
          return;
        }

        if (this.highlightCommand?.id === cmd?.id) {
          this.highlightCommand = undefined;
        }

        this.activeCommand = cmd;
        this.activeState = 'after';
      }),
    );
    Events.on(
      'preview:highlight:show',
      action((cmd: ICommand | undefined) => {
        if (this.visibleCommand?.id === cmd?.id) {
          return;
        }
        this.highlightCommand = cmd;
        this.resetHighlightInterval();
      }),
    );
    Events.on(
      'preview:highlight:hide',
      action((cmd: ICommand | undefined) => {
        if (this.highlightCommand?.id === cmd?.id) {
          this.highlightCommand = undefined;
        }
      }),
    );
  }
}
