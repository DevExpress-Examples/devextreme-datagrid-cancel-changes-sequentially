$(() => {
  const url = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
  let maxUndoSteps = 50;
  let undoTypes = ['delete', 'add', 'edit'];
  let previousChanges = [];
  let isUndoing = false;
  let undoButton;
  const changesHistory = [];

  function cloneChanges(changes) {
    return $.extend(true, [], changes);
  }

  function updateUndoButton() {
    if (undoButton) {
      undoButton.option('disabled', changesHistory.length === 0);
    }
  }

  function resetChangesHistory() {
    changesHistory.length = 0;
    previousChanges = [];
    updateUndoButton();
  }

  function getChangeKey(change) {
    return JSON.stringify(change.key);
  }

  function getEditType(before, after) {
    if (after?.type === 'remove' || before?.type === 'remove'
      || (!after && before?.type === 'insert')) {
      return 'delete';
    }
    if (after?.type === 'insert') {
      return 'add';
    }
    return 'edit';
  }

  function recordChanges(changes) {
    const beforeByKey = new Map(previousChanges.map((change) => [getChangeKey(change), change]));
    const afterByKey = new Map(changes.map((change) => [getChangeKey(change), change]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

    keys.forEach((key) => {
      const before = beforeByKey.get(key);
      const after = afterByKey.get(key);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return;
      }

      const type = getEditType(before, after);
      if (undoTypes.includes(type)) {
        changesHistory.push({ key, before: before && cloneChanges([before])[0], type });
      } else {
        for (let index = changesHistory.length - 1; index >= 0; index -= 1) {
          if (changesHistory[index].key === key) {
            changesHistory.splice(index, 1);
          }
        }
      }
    });

    changesHistory.splice(0, Math.max(0, changesHistory.length - maxUndoSteps));
    previousChanges = cloneChanges(changes);
    updateUndoButton();
  }

  function undoLastChange(grid) {
    const step = changesHistory.pop();
    if (!step) {
      return;
    }

    const changes = cloneChanges(grid.option('editing.changes'));
    const index = changes.findIndex((change) => getChangeKey(change) === step.key);
    if (index >= 0) {
      changes.splice(index, 1);
    }
    if (step.before) {
      changes.splice(index >= 0 ? index : changes.length, 0, cloneChanges([step.before])[0]);
    }

    isUndoing = true;
    try {
      grid.option('editing.changes', changes);
      previousChanges = cloneChanges(changes);
    } finally {
      isUndoing = false;
      updateUndoButton();
    }
  }

  const store = DevExpress.data.AspNet.createStore({
    key: 'OrderID',
    loadMode: 'raw',
    loadUrl: `${url}/Orders`,
    loadParams: { skip: 700 },
    insertUrl: `${url}/InsertOrder`,
    updateUrl: `${url}/UpdateOrder`,
    deleteUrl: `${url}/DeleteOrder`,
    onBeforeSend(operation, ajaxOptions) {
      ajaxOptions.xhrFields = { withCredentials: true };
    },
  });

  function handleUndoKeyDown(event) {
    if (event.ctrlKey && !event.shiftKey && !event.altKey
      && event.key?.toLowerCase() === 'z') {
      event.preventDefault();
      undoLastChange(grid);
    }
  }

  const grid = $('#grid-container').dxDataGrid({
    dataSource: store,
    showBorders: true,
    repaintChangesOnly: true,
    editing: {
      mode: 'batch',
      allowAdding: true,
      allowDeleting: true,
      allowUpdating: true,
      changes: [],
    },
    columns: [
      { dataField: 'OrderID', width: 110, allowEditing: false },
      { 
        dataField: 'OrderDate',
        dataType: 'date',
        width: 130,
        validationRules: [{ type: 'required', message: 'Order Date is required.' }]
      },
      {
        dataField: 'ShipName',
        width: 340,
        editorOptions: { maxLength: 40 },
        validationRules: [{ type: 'stringLength', max: 40, message: 'Ship Name must not exceed 40 characters.' }],
      },
      {
        dataField: 'ShipCountry',
        width: 220,
        editorOptions: { maxLength: 15 },
        validationRules: [{ type: 'stringLength', max: 15, message: 'Ship Country must not exceed 15 characters.' }],
      },
    ],
    onDisposing() {
      document.removeEventListener('keydown', handleUndoKeyDown, true);
    },
    onToolbarPreparing(e) {
      e.toolbarOptions.items = e.toolbarOptions.items.map((item) => {
        if (item.name === 'revertButton') {
          return {
            widget: 'dxButton',
            location: item.location,
            options: {
              icon: 'revert',
              hint: 'Undo the last change',
              elementAttr: { 'aria-label': 'Undo the last change' },
              disabled: changesHistory.length === 0,
              onInitialized(args) {
                undoButton = args.component;
              },
              onClick() {
                undoLastChange(e.component);
              },
            },
          };
        }
        return item;
      });
    },
    onOptionChanged(e) {
      if (e.fullName === 'editing.changes'
        && Array.isArray(e.value)
        && !isUndoing) {
        recordChanges(e.value);
      }
    },
    onSaved() {
      resetChangesHistory();
    }
  }).dxDataGrid('instance');

  document.addEventListener('keydown', handleUndoKeyDown, true);

  $('#max-undo-steps').dxNumberBox({
    value: maxUndoSteps,
    width: 120,  
    min: 0,
    max: 1000,
    step: 1,
    format: '#0',
    showSpinButtons: true,
    inputAttr: { 'aria-labelledby': 'max-undo-label' },
    onValueChanged(e) {
      const value = Number.isFinite(e.value) ? Math.floor(e.value) : maxUndoSteps;
      const limit = Math.max(0, Math.min(1000, value));
      if (e.value !== limit) {
        e.component.option('value', limit);
        return;
      }
      maxUndoSteps = limit;
      changesHistory.splice(0, Math.max(0, changesHistory.length - maxUndoSteps));
      updateUndoButton();
    },
  });

  $('#undo-types').dxTagBox({
    width: 250,
    items: ['delete', 'add', 'edit'],
    value: undoTypes,
    showSelectionControls: true,
    showSelectAll: true,
    showClearButton: true,
    inputAttr: { 'aria-labelledby': 'undo-types-label' },
    onValueChanged(e) {
      undoTypes = e.value;
      for (let index = changesHistory.length - 1; index >= 0; index -= 1) {
        if (!undoTypes.includes(changesHistory[index].type)) {
          changesHistory.splice(index, 1);
        }
      }
      updateUndoButton();
    },
  });
});
