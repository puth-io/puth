import { ICommand } from '../../App/Command';
import { makeAutoObservable } from 'mobx';

export type SnapshotState = 'before' | 'after';

export class PreviewStore {
  activeCommand: ICommand | undefined;
  activeState: SnapshotState = 'before';
  highlightCommand: ICommand | undefined;
  highlightState: SnapshotState = 'before';
  private highlightInterval: number;

  constructor() {
    makeAutoObservable(this);

    this.highlightInterval = window.setInterval(() => this.toggleHighlightState(), 1000);
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
}
