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

export function useEditHistory({ maxUndoSteps, undoTypes }: UseEditHistoryOptions) {
  const [changes, setChanges] = useState<DataChange[]>([]);
  const [historyLength, setHistoryLength] = useState(0);
  const changesRef = useRef<DataChange[]>([]);
  const historyRef = useRef<HistoryStep[]>([]);
  const previousChangesRef = useRef<DataChange[]>([]);
  const maxUndoStepsRef = useRef(maxUndoSteps);
  const undoTypesRef = useRef(undoTypes);

  function cloneChanges(value: DataChange[]): DataChange[] {
    return structuredClone(value);
  }

  function getChangeKey(change: DataChange): string | undefined {
    return JSON.stringify(change.key);
  }

  function updateChanges(value: DataChange[]): void {
    changesRef.current = value;
    setChanges(value);
  }

  function resetHistory(): void {
    historyRef.current = [];
    previousChangesRef.current = [];
    setHistoryLength(0);
  }

  function recordChanges(value: DataChange[]): void {
    const beforeByKey = new Map(previousChangesRef.current.map((change) => [
      getChangeKey(change),
      change,
    ]));
    const afterByKey = new Map(value.map((change) => [getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      let type: ChangeType;
      if (after?.type === DataChangeType.REMOVE || before?.type === DataChangeType.REMOVE
        || (!after && before?.type === DataChangeType.INSERT)) {
        type = DataChangeType.REMOVE;
      } else if (after?.type === DataChangeType.INSERT) {
        type = DataChangeType.INSERT;
      } else {
        type = DataChangeType.UPDATE;
      }

      if (undoTypesRef.current.includes(type)) {
        historyRef.current.push({
          key,
          before: before && cloneChanges([before])[0],
          type,
        });
      } else {
        historyRef.current = historyRef.current.filter((step) => step.key !== key);
      }
    });

    historyRef.current.splice(0, Math.max(0, historyRef.current.length - maxUndoStepsRef.current));
    previousChangesRef.current = cloneChanges(value);
    updateChanges(value);
    setHistoryLength(historyRef.current.length);
  }

  const onChangesChange = useCallback((value: DataChange[]): void => {
    if (value.length === 0) {
      resetHistory();
      updateChanges([]);
      return;
    }
    recordChanges(value);
  }, []);

  const undoLastChange = useCallback((): void => {
    const step = historyRef.current.pop();
    if (!step) {
      return;
    }

    const nextChanges = cloneChanges(changesRef.current);
    const index = nextChanges.findIndex((change) => getChangeKey(change) === step.key);
    if (index >= 0) {
      nextChanges.splice(index, 1);
    }
    if (step.before) {
      nextChanges.splice(index >= 0 ? index : nextChanges.length, 0, cloneChanges([step.before])[0]);
    }

    previousChangesRef.current = cloneChanges(nextChanges);
    updateChanges(nextChanges);
    setHistoryLength(historyRef.current.length);
  }, []);

  const setMaxUndoSteps = useCallback((value: number): void => {
    maxUndoStepsRef.current = value;
    historyRef.current.splice(0, Math.max(0, historyRef.current.length - value));
    setHistoryLength(historyRef.current.length);
  }, []);

  const setUndoTypes = useCallback((value: ChangeType[]): void => {
    undoTypesRef.current = value;
    historyRef.current = historyRef.current.filter((step) => value.includes(step.type));
    setHistoryLength(historyRef.current.length);
  }, []);

  return {
    changes,
    historyLength,
    onChangesChange,
    undoLastChange,
    setMaxUndoSteps,
    setUndoTypes,
  };
}
