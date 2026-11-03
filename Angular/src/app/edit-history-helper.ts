import type { DataChange, DataChangeType as ChangeType } from 'devextreme/common/grids';
import type DataGrid from 'devextreme/ui/data_grid';

export const DataChangeType = {
  INSERT: 'insert',
  REMOVE: 'remove',
  UPDATE: 'update',
} as const;

type HistoryStep = {
  key: string | undefined;
  before?: DataChange;
  type: ChangeType;
};

type EditHistoryOptions = {
  maxUndoSteps?: number;
  undoTypes?: ChangeType[];
  onHistoryChanged?: (historyLength: number) => void;
};

export class EditHistoryHelper {
  private changesHistory: HistoryStep[] = [];
  private previousChanges: DataChange[] = [];
  private maxUndoSteps: number;
  private undoTypes: ChangeType[];
  private isUndoing = false;
  private readonly onHistoryChanged: (historyLength: number) => void;

  constructor(options: EditHistoryOptions = {}) {
    this.maxUndoSteps = options.maxUndoSteps ?? 50;
    this.undoTypes = options.undoTypes ?? Object.values(DataChangeType);
    this.onHistoryChanged = options.onHistoryChanged ?? (() => {});
  }

  private getEditType(before?: DataChange, after?: DataChange): ChangeType {
    if (after?.type === DataChangeType.REMOVE || before?.type === DataChangeType.REMOVE
      || (!after && before?.type === DataChangeType.INSERT)) {
      return DataChangeType.REMOVE;
    }
    if (after?.type === DataChangeType.INSERT) {
      return DataChangeType.INSERT;
    }
    return DataChangeType.UPDATE;
  }

  private getChangeKey(change: DataChange): string | undefined {
    return JSON.stringify(change.key);
  }

  private cloneChanges(changes: DataChange[]): DataChange[] {
    return structuredClone(changes);
  }

  recordChanges(changes: DataChange[]): void {
    const beforeByKey = new Map(this.previousChanges.map((change) => [
      this.getChangeKey(change),
      change,
    ]));
    const afterByKey = new Map(changes.map((change) => [this.getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      const type = this.getEditType(before, after);
      if (this.undoTypes.includes(type)) {
        this.changesHistory.push({
          key,
          before: before && this.cloneChanges([before])[0],
          type,
        });
      } else {
        for (let index = this.changesHistory.length - 1; index >= 0; index -= 1) {
          if (this.changesHistory[index].key === key) {
            this.changesHistory.splice(index, 1);
          }
        }
      }
    });

    this.changesHistory.splice(0, Math.max(0, this.changesHistory.length - this.maxUndoSteps));
    this.previousChanges = this.cloneChanges(changes);
    this.onHistoryChanged(this.changesHistory.length);
  }

  undoLastChange(grid: DataGrid): void {
    const step = this.changesHistory.pop();
    if (!step) {
      return;
    }

    const pendingChanges = grid.option('editing.changes');
    const changes = this.cloneChanges(Array.isArray(pendingChanges) ? pendingChanges : []);
    const index = changes.findIndex((change) => this.getChangeKey(change) === step.key);
    if (index >= 0) {
      changes.splice(index, 1);
    }
    if (step.before) {
      changes.splice(index >= 0 ? index : changes.length, 0, this.cloneChanges([step.before])[0]);
    }

    this.isUndoing = true;
    try {
      grid.option('editing.changes', changes);
      this.previousChanges = this.cloneChanges(changes);
    } finally {
      this.isUndoing = false;
      this.onHistoryChanged(this.changesHistory.length);
    }
  }

  clearHistory(grid: DataGrid): void {
    grid.option('editing.changes', []);
    this.resetHistory();
  }

  resetHistory(): void {
    this.changesHistory.length = 0;
    this.previousChanges = [];
    this.onHistoryChanged(0);
  }

  getHistoryLength(): number {
    return this.changesHistory.length;
  }

  setMaxUndoSteps(maxSteps: number): void {
    this.maxUndoSteps = maxSteps;
    this.changesHistory.splice(0, Math.max(0, this.changesHistory.length - this.maxUndoSteps));
    this.onHistoryChanged(this.changesHistory.length);
  }

  setUndoTypes(types: ChangeType[]): void {
    this.undoTypes = types;
    for (let index = this.changesHistory.length - 1; index >= 0; index -= 1) {
      if (!this.undoTypes.includes(this.changesHistory[index].type)) {
        this.changesHistory.splice(index, 1);
      }
    }
    this.onHistoryChanged(this.changesHistory.length);
  }

  isUndoInProgress(): boolean {
    return this.isUndoing;
  }
}
