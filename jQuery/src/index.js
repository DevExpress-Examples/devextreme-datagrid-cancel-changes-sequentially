$(() => {
  const url = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
  const undoTypes = Object.values(DataChangeType);
  let undoButton;
  let clearHistoryButton;

  let grid;
  
  const changeHistoryHelper = new EditHistoryHelper({
    maxUndoSteps: 50,
    undoTypes,
    onHistoryChanged: (historyLength) => {
      updateControlsState(historyLength, grid);
    },
  });

  function updateControlsState(historyLength, gridInstance) {
    if (undoButton) {
      undoButton.option('disabled', historyLength === 0);
    }
    if (clearHistoryButton) {
      clearHistoryButton.option('disabled', gridInstance ? !gridInstance.hasEditData() : historyLength === 0);
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
              disabled: changeHistoryHelper.getHistoryLength() === 0,
              onInitialized(args) {
                undoButton = args.component;
              },
              onClick() {
                changeHistoryHelper.undoLastChange(e.component);
              },
            },
          };
        }
        return item;
      });
      
      e.toolbarOptions.items.push({
        widget: 'dxButton',
        location: 'after',
        options: {
          icon: 'trash',
          hint: 'Clear all changes',
          elementAttr: { 'aria-label': 'Clear all changes' },
          disabled: !e.component.hasEditData(),
          onInitialized(args) {
            clearHistoryButton = args.component;
          },
          onClick() {
            changeHistoryHelper.clearHistory(e.component);
          },
        },
      });
    },
    onOptionChanged(e) {
      if (e.fullName === 'editing.changes'
        && Array.isArray(e.value)
        && !changeHistoryHelper.isUndoInProgress()) {
        changeHistoryHelper.recordChanges(e.value);
      }
    },
    onSaved() {
      changeHistoryHelper.resetHistory();
    }
  }).dxDataGrid('instance');

  document.addEventListener('keydown', handleUndoKeyDown, true);

  $('#max-undo-steps').dxNumberBox({
    value: 50,
    width: 120,  
    min: 0,
    max: 1000,
    step: 1,
    format: '#0',
    showSpinButtons: true,
    inputAttr: { 'aria-labelledby': 'max-undo-label' },
    onValueChanged(e) {
      const value = Number.isFinite(e.value) ? Math.floor(e.value) : 50;
      const limit = Math.max(0, Math.min(1000, value));
      if (e.value !== limit) {
        e.component.option('value', limit);
        return;
      }
      changeHistoryHelper.setMaxUndoSteps(limit);
    },
  });

  let undoTypesHelper;

  $('#undo-types').dxTagBox({
    width: 250,
    items: undoTypes,
    value: undoTypes,
    showSelectionControls: true,
    showSelectAll: true,
    showClearButton: true,
    inputAttr: { 'aria-labelledby': 'undo-types-label' },
    onInitialized(e) {
      undoTypesHelper = { previousValue: e.component.option('value') };
    },
    onValueChanged(e) {
      const newValue = e.value;
      const previousValue = undoTypesHelper.previousValue || [];
      
      const itemsAdded = newValue.some(item => !previousValue.includes(item));
      
      changeHistoryHelper.setUndoTypes(newValue);
      
      if (itemsAdded) {
        grid.cancelEditData();
      }
      
      undoTypesHelper.previousValue = newValue;
    },
  });
});
