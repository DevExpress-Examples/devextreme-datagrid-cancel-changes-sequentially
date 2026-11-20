import { computed, Injectable, signal } from '@angular/core';
import type { DataChange, DataChangeType as ChangeType } from 'devextreme/common/grids';

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

function getChangeKey(change: DataChange): string | undefined {
  return JSON.stringify(change.key);
}

function getStepType(before?: DataChange, after?: DataChange): ChangeType {
  if (after?.type === DataChangeType.REMOVE || before?.type === DataChangeType.REMOVE
    || (!after && before?.type === DataChangeType.INSERT)) {
    return DataChangeType.REMOVE;
  }
  if (after?.type === DataChangeType.INSERT) {
    return DataChangeType.INSERT;
  }
  return DataChangeType.UPDATE;
}

function trimHistory(history: HistoryStep[], maxUndoSteps: number): HistoryStep[] {
  return history.slice(Math.max(0, history.length - maxUndoSteps));
}

@Injectable()
export class EditHistoryService {
  private readonly pendingChanges = signal<DataChange[]>([]);
  private readonly history = signal<HistoryStep[]>([]);
  private previousChanges: DataChange[] = [];
  private maxUndoSteps = 50;
  private undoTypes: ChangeType[] = Object.values(DataChangeType);

  readonly changes = this.pendingChanges.asReadonly();
  readonly historyLength = computed(() => this.history().length);

  private updateChanges(value: DataChange[]): void {
    // Keep a separate snapshot because the grid can mutate the bound changes.
    this.previousChanges = structuredClone(value);
    this.pendingChanges.set(value);
  }

  onChangesChange(value: DataChange[]): void {
    if (value.length === 0) {
      this.history.set([]);
      this.updateChanges(value);
      return;
    }

    const beforeByKey = new Map(this.previousChanges.map((change) => [getChangeKey(change), change]));
    const afterByKey = new Map(value.map((change) => [getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    let history = [...this.history()];

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      const type = getStepType(before, after);
      if (this.undoTypes.includes(type)) {
        history.push({ key, before: before && structuredClone(before), type });
      } else {
        history = history.filter((step) => step.key !== key);
      }
    });

    this.history.set(trimHistory(history, this.maxUndoSteps));
    this.updateChanges(value);
  }

  undoLastChange(): void {
    const history = [...this.history()];
    const step = history.pop();
    if (!step) {
      return;
    }

    const changes = structuredClone(this.changes());
    const index = changes.findIndex((change) => getChangeKey(change) === step.key);
    if (index >= 0) {
      changes.splice(index, 1);
    }
    if (step.before) {
      changes.splice(index >= 0 ? index : changes.length, 0, structuredClone(step.before));
    }

    // Update the snapshot before bindings notify us, so undo is not recorded as an edit.
    this.history.set(history);
    this.updateChanges(changes);
  }

  setMaxUndoSteps(value: number): void {
    this.maxUndoSteps = value;
    this.history.update((history) => trimHistory(history, value));
  }

  setUndoTypes(value: ChangeType[]): void {
    this.undoTypes = value;
    this.history.update((history) => history.filter((step) => value.includes(step.type)));
  }
}
