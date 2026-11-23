import { computed, shallowRef } from 'vue';
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

type UseEditHistoryOptions = {
  maxUndoSteps: number;
  undoTypes: ChangeType[];
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

export function useEditHistory(options: UseEditHistoryOptions) {
  const pendingChanges = shallowRef<DataChange[]>([]);
  const history = shallowRef<HistoryStep[]>([]);
  const changes = computed(() => pendingChanges.value);
  const historyLength = computed(() => history.value.length);
  let previousChanges: DataChange[] = [];
  let maxUndoSteps = options.maxUndoSteps;
  let undoTypes = options.undoTypes;

  function updateChanges(value: DataChange[]): void {
    // Keep a separate snapshot because the grid can mutate the bound changes.
    previousChanges = structuredClone(value);
    pendingChanges.value = value;
  }

  function onChangesChange(value: DataChange[]): void {
    if (value.length === 0) {
      history.value = [];
      updateChanges(value);
      return;
    }

    const beforeByKey = new Map(previousChanges.map((change) => [getChangeKey(change), change]));
    const afterByKey = new Map(value.map((change) => [getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    let nextHistory = [...history.value];

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      const type = getStepType(before, after);
      if (undoTypes.includes(type)) {
        nextHistory.push({ key, before: before && structuredClone(before), type });
      } else {
        nextHistory = nextHistory.filter((step) => step.key !== key);
      }
    });

    history.value = trimHistory(nextHistory, maxUndoSteps);
    updateChanges(value);
  }

  function undoLastChange(): void {
    const nextHistory = [...history.value];
    const step = nextHistory.pop();
    if (!step) {
      return;
    }

    const nextChanges = structuredClone(changes.value);
    const index = nextChanges.findIndex((change) => getChangeKey(change) === step.key);
    if (index >= 0) {
      nextChanges.splice(index, 1);
    }
    if (step.before) {
      nextChanges.splice(index >= 0 ? index : nextChanges.length, 0, structuredClone(step.before));
    }

    // Update the snapshot before bindings notify us, so undo is not recorded as an edit.
    history.value = nextHistory;
    updateChanges(nextChanges);
  }

  function setMaxUndoSteps(value: number): void {
    maxUndoSteps = value;
    history.value = trimHistory(history.value, value);
  }

  function setUndoTypes(value: ChangeType[]): void {
    undoTypes = value;
    history.value = history.value.filter((step) => value.includes(step.type));
  }

  return {
    changes,
    historyLength,
    onChangesChange,
    undoLastChange,
    setMaxUndoSteps,
    setUndoTypes,
  };
}
