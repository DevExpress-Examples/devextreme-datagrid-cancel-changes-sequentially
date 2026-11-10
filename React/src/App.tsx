import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import './App.css';
import 'devextreme/dist/css/dx.fluent.blue.light.css';
import DataGrid, {
  Column,
  Editing,
  Item as ToolbarItem,
  RequiredRule,
  StringLengthRule,
  Toolbar,
  type DataGridRef,
} from 'devextreme-react/data-grid';
import NumberBox, { type NumberBoxTypes } from 'devextreme-react/number-box';
import TagBox, { type TagBoxTypes } from 'devextreme-react/tag-box';
import { createStore } from 'devextreme-aspnet-data-nojquery';
import { DataChangeType, useEditHistory } from './edit-history-helper';

const apiUrl = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
const defaultMaxUndoSteps = 50;
const undoTypes = Object.values(DataChangeType);
type StoreBeforeSend = NonNullable<Parameters<typeof createStore>[0]['onBeforeSend']>;

function setCredentials(_operation: string, ajaxSettings: Parameters<StoreBeforeSend>[1]): void {
  ajaxSettings.xhrFields = { withCredentials: true };
}

const dataSource = createStore({
  key: 'OrderID',
  loadMode: 'raw',
  loadUrl: `${apiUrl}/Orders`,
  loadParams: { skip: 700 },
  insertUrl: `${apiUrl}/InsertOrder`,
  updateUrl: `${apiUrl}/UpdateOrder`,
  deleteUrl: `${apiUrl}/DeleteOrder`,
  onBeforeSend: setCredentials,
});

const maxUndoInputAttributes = { 'aria-labelledby': 'max-undo-label' };
const undoTypesInputAttributes = { 'aria-labelledby': 'undo-types-label' };
const shipNameEditorOptions = { maxLength: 40 };
const shipCountryEditorOptions = { maxLength: 15 };
const revertButtonOptions = { icon: 'trash' };

function App(): JSX.Element {
  const gridRef = useRef<DataGridRef>(null);
  const [maxUndoSteps, setMaxUndoStepsValue] = useState(defaultMaxUndoSteps);
  const [selectedUndoTypes, setSelectedUndoTypes] = useState<typeof undoTypes>(undoTypes);
  const {
    changes,
    historyLength,
    onChangesChange,
    undoLastChange,
    setMaxUndoSteps,
    setUndoTypes,
  } = useEditHistory({ maxUndoSteps: defaultMaxUndoSteps, undoTypes });

  useEffect(() => {
    function handleUndoKeyDown(event: KeyboardEvent): void {
      if (historyLength > 0
        && event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLastChange();
      }
    }
    document.addEventListener('keydown', handleUndoKeyDown);
    return () => document.removeEventListener('keydown', handleUndoKeyDown);
  }, [historyLength, undoLastChange]);

  const handleMaxUndoStepsChanged = useCallback((event: NumberBoxTypes.ValueChangedEvent): void => {
    const value = Number.isFinite(event.value) ? Math.floor(event.value) : defaultMaxUndoSteps;
    const limit = Math.max(0, Math.min(1000, value));
    setMaxUndoStepsValue(limit);
    setMaxUndoSteps(limit);
  }, [setMaxUndoSteps]);

  const handleUndoTypesChanged = useCallback((event: TagBoxTypes.ValueChangedEvent): void => {
    const newValue = event.value as typeof undoTypes;
    const itemsAdded = newValue.some((item) => !event.previousValue.includes(item));

    setSelectedUndoTypes(newValue);
    setUndoTypes(newValue);
    if (itemsAdded) {
      gridRef.current?.instance().cancelEditData();
    }
  }, [setUndoTypes]);

  const undoButtonOptions = useMemo(() => ({
    icon: 'revert',
    hint: 'Undo the last change',
    elementAttr: { 'aria-label': 'Undo the last change' },
    disabled: historyLength === 0,
    onClick: undoLastChange,
  }), [historyLength, undoLastChange]);

  return (
    <main className="demo-container">
      <DataGrid
        className="orders-grid"
        dataSource={dataSource}
        showBorders={true}
        repaintChangesOnly={true}
        ref={gridRef}
      >
        <Editing
          mode="batch"
          allowAdding={true}
          allowDeleting={true}
          allowUpdating={true}
          changes={changes}
          onChangesChange={onChangesChange}
        />
        <Toolbar>
          <ToolbarItem name="addRowButton" />
          <ToolbarItem name="saveButton" />
          <ToolbarItem location="after" widget="dxButton" options={undoButtonOptions} />
          <ToolbarItem name="revertButton" options={revertButtonOptions} />
        </Toolbar>
        <Column dataField="OrderID" width={110} allowEditing={false} />
        <Column dataField="OrderDate" dataType="date" width={130}>
          <RequiredRule message="Order Date is required." />
        </Column>
        <Column dataField="ShipName" width={340} editorOptions={shipNameEditorOptions}>
          <StringLengthRule max={40} message="Ship Name must not exceed 40 characters." />
        </Column>
        <Column dataField="ShipCountry" width={220} editorOptions={shipCountryEditorOptions}>
          <StringLengthRule max={15} message="Ship Country must not exceed 15 characters." />
        </Column>
      </DataGrid>

      <section className="options">
        <div className="caption">Options</div>
        <div className="option">
          <label id="max-undo-label" htmlFor="max-undo-steps">Maximum undo steps</label>
          <NumberBox
            id="max-undo-steps"
            value={maxUndoSteps}
            width={120}
            min={0}
            max={1000}
            step={1}
            format="#0"
            showSpinButtons={true}
            inputAttr={maxUndoInputAttributes}
            onValueChanged={handleMaxUndoStepsChanged}
          />
        </div>
        <div className="option">
          <label id="undo-types-label" htmlFor="undo-types">Undo edit types</label>
          <TagBox
            id="undo-types"
            width={250}
            items={undoTypes}
            value={selectedUndoTypes}
            showSelectionControls={true}
            showClearButton={true}
            inputAttr={undoTypesInputAttributes}
            onValueChanged={handleUndoTypesChanged}
          />
        </div>
      </section>
    </main>
  );
}

export default App;
