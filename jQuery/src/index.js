$(() => {
  const url = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
  const defaultMaxUndoSteps = 50;
  const undoTypes = Object.values(DataChangeType);
  let undoButton;

  let grid;
  
  const changeHistoryHelper = new EditHistoryHelper({
    maxUndoSteps: defaultMaxUndoSteps,
    undoTypes,
    onHistoryChanged: (historyLength) => {
      updateControlsState(historyLength);
    },
  });

  function updateControlsState(historyLength) {
    if (undoButton) {
      undoButton.option('disabled', historyLength === 0);
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
    if (changeHistoryHelper.getHistoryLength() > 0
      && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey
      && event.key?.toLowerCase() === 'z') {
      event.preventDefault();
      changeHistoryHelper.undoLastChange(grid);
    }
  }

  grid = $('#grid-container').dxDataGrid({
    dataSource: store,
    showBorders: true,
    repaintChangesOnly: true,
    editing: {
      mode: 'batch',
      allowAdding: true,
      allowDeleting: true,
      allowUpdating: true,
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
    toolbar: {
      items: [
        'addRowButton',
        'saveButton',
        {
          widget: 'dxButton',
          location: 'after',
          options: {
            icon: 'revert',
            hint: 'Undo the last change',
            elementAttr: { 'aria-label': 'Undo the last change' },
            disabled: changeHistoryHelper.getHistoryLength() === 0,
            onInitialized(args) {
              undoButton = args.component;
            },
            onClick() {
              changeHistoryHelper.undoLastChange(grid);
            },
          },
        },
        {
          name: 'revertButton',
          options: { icon: 'trash' },
        },
      ],
    },
    onOptionChanged(e) {
      if (e.fullName === 'editing.changes'
        && Array.isArray(e.value)
        && !changeHistoryHelper.isUndoInProgress()) {
        if (e.value.length === 0) {
          changeHistoryHelper.resetHistory();
        } else {
          changeHistoryHelper.recordChanges(e.value);
        }
      }
    },
    onSaved() {
      changeHistoryHelper.resetHistory();
    }
  }).dxDataGrid('instance');

  document.addEventListener('keydown', handleUndoKeyDown, true);

  $('#max-undo-steps').dxNumberBox({
    value: defaultMaxUndoSteps,
    width: 120,  
    min: 0,
    max: 1000,
    step: 1,
    format: '#0',
    showSpinButtons: true,
    inputAttr: { 'aria-labelledby': 'max-undo-label' },
    onValueChanged(e) {
      const value = Number.isFinite(e.value) ? Math.floor(e.value) : defaultMaxUndoSteps;
      const limit = Math.max(0, Math.min(1000, value));
      if (e.value !== limit) {
        e.component.option('value', limit);
        return;
      }
      changeHistoryHelper.setMaxUndoSteps(limit);
    },
  });

  $('#undo-types').dxTagBox({
    width: 250,
    items: undoTypes,
    value: undoTypes,
    showSelectionControls: true,
    showSelectAll: true,
    showClearButton: true,
    inputAttr: { 'aria-labelledby': 'undo-types-label' },
    onValueChanged(e) {
      const newValue = e.value;
      const itemsAdded = newValue.some(item => !e.previousValue.includes(item));
      
      changeHistoryHelper.setUndoTypes(newValue);
      
      if (itemsAdded) {
        grid.cancelEditData();
      }
    },
  });
});
