import { useCallback, useRef, useState } from 'react';
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

function cloneChanges(value: DataChange[]): DataChange[] {
  return structuredClone(value);
}

function cloneChange(value: DataChange): DataChange {
  return structuredClone(value);
}

function getChangeKey(change: DataChange): string | undefined {
  return JSON.stringify(change.key);
}

function getStepType(before: DataChange | undefined, after: DataChange | undefined): ChangeType {
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

export function useEditHistory({ maxUndoSteps, undoTypes }: UseEditHistoryOptions) {
  const [changes, setChanges] = useState<DataChange[]>([]);
  const [historyLength, setHistoryLength] = useState(0);
  const changesRef = useRef<DataChange[]>([]);
  const historyRef = useRef<HistoryStep[]>([]);
  const previousChangesRef = useRef<DataChange[]>([]);
  const maxUndoStepsRef = useRef(maxUndoSteps);
  const undoTypesRef = useRef(undoTypes);

  const updateChanges = useCallback((value: DataChange[]): void => {
    changesRef.current = value;
    previousChangesRef.current = cloneChanges(value);
    setChanges(value);
  }, []);

  const updateHistory = useCallback((value: HistoryStep[]): void => {
    historyRef.current = value;
    setHistoryLength(value.length);
  }, []);

  const recordChanges = useCallback((value: DataChange[]): void => {
    const beforeByKey = new Map(previousChangesRef.current.map((change) => [
      getChangeKey(change),
      change,
    ]));
    const afterByKey = new Map(value.map((change) => [getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    let history = [...historyRef.current];

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      const type = getStepType(before, after);
      if (undoTypesRef.current.includes(type)) {
        history.push({ key, before: before && cloneChange(before), type });
      } else {
        history = history.filter((step) => step.key !== key);
      }
    });

    updateHistory(trimHistory(history, maxUndoStepsRef.current));
    updateChanges(value);
  }, [updateChanges, updateHistory]);

  const onChangesChange = useCallback((value: DataChange[]): void => {
    if (value.length === 0) {
      updateHistory([]);
      updateChanges([]);
      return;
    }
    recordChanges(value);
  }, [recordChanges, updateChanges, updateHistory]);

  const undoLastChange = useCallback((): void => {
    const history = [...historyRef.current];
    const step = history.pop();
    if (!step) {
      return;
    }

    const nextChanges = cloneChanges(changesRef.current);
    const index = nextChanges.findIndex((change) => getChangeKey(change) === step.key);
    if (index >= 0) {
      nextChanges.splice(index, 1);
    }
    if (step.before) {
      nextChanges.splice(index >= 0 ? index : nextChanges.length, 0, cloneChange(step.before));
    }

    updateHistory(history);
    updateChanges(nextChanges);
  }, [updateChanges, updateHistory]);

  const setMaxUndoSteps = useCallback((value: number): void => {
    maxUndoStepsRef.current = value;
    updateHistory(trimHistory(historyRef.current, value));
  }, [updateHistory]);

  const setUndoTypes = useCallback((value: ChangeType[]): void => {
    undoTypesRef.current = value;
    updateHistory(historyRef.current.filter((step) => value.includes(step.type)));
  }, [updateHistory]);

  return {
    changes,
    historyLength,
    onChangesChange,
    undoLastChange,
    setMaxUndoSteps,
    setUndoTypes,
  };
}
