import { ICommand } from '../Command/Command';
import { action, makeAutoObservable } from 'mobx';
import { BlobHandler, recover } from '../../Misc/SnapshotRecovering';
import { Events } from '../../../index';

export type SnapshotState = 'before' | 'after';

export class PreviewStoreClass {
  private _activeCommand: ICommand | undefined;
  activeState: SnapshotState = 'before';
  highlightCommand: ICommand | undefined;
  highlightState: SnapshotState = 'after';
  private highlightInterval: number;

  constructor() {
    makeAutoObservable(this);

    this.registerEvents();
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
    BlobHandler.cleanup();

    let command = this.visibleCommand;
    let snapshot = this.visibleSnapshot;

    if (!snapshot) {
      return;
    }

    let html = snapshot?.html?.src;

    if (!html) {
      return;
    }
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
    recover(command, snapshot, parsedDocument);

    return BlobHandler.createUrlFromString(parsedDocument.documentElement.innerHTML, { type: 'text/html' });
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
    this._activeCommand = command;
  }

  get activeCommand() {
    return this._activeCommand;
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
