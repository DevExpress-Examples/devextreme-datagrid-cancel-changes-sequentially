import { Component, createRef } from 'react';
import './App.css';
import 'devextreme/dist/css/dx.material.blue.light.compact.css';
import DataGrid, {
  Column,
  Editing,
  Item as ToolbarItem,
  RequiredRule,
  StringLengthRule,
  Toolbar,
  type DataGridRef,
  type DataGridTypes,
} from 'devextreme-react/data-grid';
import NumberBox, { type NumberBoxTypes } from 'devextreme-react/number-box';
import TagBox, { type TagBoxTypes } from 'devextreme-react/tag-box';
import { createStore } from 'devextreme-aspnet-data-nojquery';
import { DataChangeType, EditHistoryHelper } from './edit-history-helper';

const apiUrl = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
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

type AppState = {
  maxUndoSteps: number;
  selectedUndoTypes: typeof undoTypes;
  historyLength: number;
  undoButtonOptions: {
    icon: string;
    hint: string;
    elementAttr: { 'aria-label': string };
    disabled: boolean;
    onClick: () => void;
  };
};

class App extends Component<Record<string, never>, AppState> {
  private readonly gridRef = createRef<DataGridRef>();

  private readonly changeHistoryHelper: EditHistoryHelper;

  private previousUndoTypes = undoTypes;

  constructor(props: Record<string, never>) {
    super(props);
    this.handleUndoLastChange = this.handleUndoLastChange.bind(this);
    this.handleOptionChanged = this.handleOptionChanged.bind(this);
    this.handleSaved = this.handleSaved.bind(this);
    this.handleMaxUndoStepsChanged = this.handleMaxUndoStepsChanged.bind(this);
    this.handleUndoTypesChanged = this.handleUndoTypesChanged.bind(this);
    this.handleUndoKeyDown = this.handleUndoKeyDown.bind(this);
    this.handleHistoryChanged = this.handleHistoryChanged.bind(this);

    this.state = {
      maxUndoSteps: 50,
      selectedUndoTypes: undoTypes,
      historyLength: 0,
      undoButtonOptions: {
        icon: 'revert',
        hint: 'Undo the last change',
        elementAttr: { 'aria-label': 'Undo the last change' },
        disabled: true,
        onClick: this.handleUndoLastChange,
      },
    };
    this.changeHistoryHelper = new EditHistoryHelper({
      maxUndoSteps: 50,
      undoTypes,
      onHistoryChanged: this.handleHistoryChanged,
    });
  }

  componentDidMount(): void {
    document.addEventListener('keydown', this.handleUndoKeyDown);
  }

  componentWillUnmount(): void {
    document.removeEventListener('keydown', this.handleUndoKeyDown);
  }

  private handleUndoLastChange(): void {
    if (this.gridRef.current) {
      this.changeHistoryHelper.undoLastChange(this.gridRef.current.instance());
    }
  }

  private handleOptionChanged(event: DataGridTypes.OptionChangedEvent): void {
    if (event.fullName !== 'editing.changes' || !Array.isArray(event.value)
      || this.changeHistoryHelper.isUndoInProgress()) {
      return;
    }
    if (event.value.length === 0) {
      this.changeHistoryHelper.resetHistory();
    } else {
      this.changeHistoryHelper.recordChanges(event.value);
    }
  }

  private handleSaved(): void {
    this.changeHistoryHelper.resetHistory();
  }

  private handleMaxUndoStepsChanged(event: NumberBoxTypes.ValueChangedEvent): void {
    const value = Number.isFinite(event.value) ? Math.floor(event.value) : 50;
    const limit = Math.max(0, Math.min(1000, value));
    this.setState({ maxUndoSteps: limit });
    this.changeHistoryHelper.setMaxUndoSteps(limit);
  }

  private handleUndoTypesChanged(event: TagBoxTypes.ValueChangedEvent): void {
    const newValue = event.value as typeof undoTypes;
    const itemsAdded = newValue.some((item) => !this.previousUndoTypes.includes(item));

    this.setState({ selectedUndoTypes: newValue });
    this.changeHistoryHelper.setUndoTypes(newValue);
    if (itemsAdded) {
      this.gridRef.current?.instance().cancelEditData();
    }
    this.previousUndoTypes = [...newValue];
  }

  private handleUndoKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.handleUndoLastChange();
    }
  }

  private handleHistoryChanged(historyLength: number): void {
    this.setState({
      historyLength,
      undoButtonOptions: {
        ...this.state.undoButtonOptions,
        disabled: historyLength === 0,
      },
    });
  }

  render(): JSX.Element {
    return (
      <main className="demo-container">
      <DataGrid
        dataSource={dataSource}
        showBorders={true}
        repaintChangesOnly={true}
        ref={this.gridRef}
        onOptionChanged={this.handleOptionChanged}
        onSaved={this.handleSaved}
      >
        <Editing mode="batch" allowAdding={true} allowDeleting={true} allowUpdating={true} />
        <Toolbar>
          <ToolbarItem name="addRowButton" />
          <ToolbarItem name="saveButton" />
          <ToolbarItem location="after" widget="dxButton" options={this.state.undoButtonOptions} />
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
            value={this.state.maxUndoSteps}
            width={120}
            min={0}
            max={1000}
            step={1}
            format="#0"
            showSpinButtons={true}
            inputAttr={maxUndoInputAttributes}
            onValueChanged={this.handleMaxUndoStepsChanged}
          />
        </div>
        <div className="option">
          <label id="undo-types-label" htmlFor="undo-types">Undo edit types</label>
          <TagBox
            id="undo-types"
            width={250}
            items={undoTypes}
            value={this.state.selectedUndoTypes}
            showSelectionControls={true}
            showClearButton={true}
            inputAttr={undoTypesInputAttributes}
            onValueChanged={this.handleUndoTypesChanged}
          />
        </div>
      </section>
      </main>
    );
  }
}

export default App;
