const DataChangeType = {
  INSERT: 'insert',
  REMOVE: 'remove',
  UPDATE: 'update',
};

class EditHistoryHelper {
  constructor(options = {}) {
    this.changesHistory = [];
    this.previousChanges = [];
    this.maxUndoSteps = options.maxUndoSteps || 50;
    this.undoTypes = options.undoTypes || Object.values(DataChangeType);
    this.isUndoing = false;
    this.onHistoryChanged = options.onHistoryChanged || (() => {});
  }

  getEditType(before, after) {
    if (after?.type === DataChangeType.REMOVE || before?.type === DataChangeType.REMOVE
      || (!after && before?.type === DataChangeType.INSERT)) {
      return DataChangeType.REMOVE;
    }
    if (after?.type === DataChangeType.INSERT) {
      return DataChangeType.INSERT;
    }
    return DataChangeType.UPDATE;
  }

  getChangeKey(change) {
    return JSON.stringify(change.key);
  }

  cloneChanges(changes) {
    return $.extend(true, [], changes);
  }

  recordChanges(changes) {
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

  undoLastChange(grid) {
    const step = this.changesHistory.pop();
    if (!step) {
      return;
    }

    const changes = this.cloneChanges(grid.option('editing.changes'));
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

  clearHistory(grid) {
    this.isUndoing = true;
    try {
      grid.option('editing.changes', []);
    } finally {
      this.isUndoing = false;
      this.resetHistory();
    }
  }

  resetHistory() {
    this.changesHistory.length = 0;
    this.previousChanges = [];
    this.onHistoryChanged(0);
  }

  getHistoryLength() {
    return this.changesHistory.length;
  }

  setMaxUndoSteps(maxSteps) {
    this.maxUndoSteps = maxSteps;
    this.changesHistory.splice(0, Math.max(0, this.changesHistory.length - this.maxUndoSteps));
    this.onHistoryChanged(this.changesHistory.length);
  }

  setUndoTypes(types) {
    this.undoTypes = types;
    for (let index = this.changesHistory.length - 1; index >= 0; index -= 1) {
      if (!this.undoTypes.includes(this.changesHistory[index].type)) {
        this.changesHistory.splice(index, 1);
      }
    }
    this.onHistoryChanged(this.changesHistory.length);
  }

  isUndoInProgress() {
    return this.isUndoing;
  }

  markUndoInProgress(value) {
    this.isUndoing = value;
  }
}
