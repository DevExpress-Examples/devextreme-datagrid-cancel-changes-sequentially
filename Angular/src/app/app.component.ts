import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { DxButtonModule, DxButtonTypes } from 'devextreme-angular/ui/button';
import { DxDataGridModule, DxDataGridTypes } from 'devextreme-angular/ui/data-grid';
import { DxNumberBoxModule, DxNumberBoxTypes } from 'devextreme-angular/ui/number-box';
import { DxTagBoxModule, DxTagBoxTypes } from 'devextreme-angular/ui/tag-box';
import { createStore } from 'devextreme-aspnet-data-nojquery';
import Button from 'devextreme/ui/button';
import DataGrid from 'devextreme/ui/data_grid';
import { DataChangeType, EditHistoryHelper } from './edit-history-helper';

const apiUrl = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';

@Component({
  selector: 'app-root',
  imports: [DxButtonModule, DxDataGridModule, DxNumberBoxModule, DxTagBoxModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly undoTypes = Object.values(DataChangeType);
  readonly orderDateValidationRules = [
    { type: 'required', message: 'Order Date is required.' },
  ];
  readonly shipNameValidationRules = [
    { type: 'stringLength', max: 40, message: 'Ship Name must not exceed 40 characters.' },
  ];
  readonly shipCountryValidationRules = [
    { type: 'stringLength', max: 15, message: 'Ship Country must not exceed 15 characters.' },
  ];
  readonly dataSource = createStore({
    key: 'OrderID',
    loadMode: 'raw',
    loadUrl: `${apiUrl}/Orders`,
    loadParams: { skip: 700 },
    insertUrl: `${apiUrl}/InsertOrder`,
    updateUrl: `${apiUrl}/UpdateOrder`,
    deleteUrl: `${apiUrl}/DeleteOrder`,
    onBeforeSend: (_operation, ajaxSettings) => {
      ajaxSettings.xhrFields = { withCredentials: true };
    },
  });

  readonly changeHistoryHelper = new EditHistoryHelper({
    maxUndoSteps: 50,
    undoTypes: this.undoTypes,
    onHistoryChanged: () => this.updateControlsState(),
  });

  private grid?: DataGrid;
  private undoButton?: Button;
  private clearHistoryButton?: Button;
  private previousUndoTypes = [...this.undoTypes];

  @HostListener('document:keydown', ['$event'])
  handleUndoKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (this.grid) {
        this.changeHistoryHelper.undoLastChange(this.grid);
      }
    }
  }

  onGridInitialized(e: DxDataGridTypes.InitializedEvent): void {
    this.grid = e.component;
    this.updateControlsState();
  }

  onToolbarPreparing(e: DxDataGridTypes.ToolbarPreparingEvent): void {
    const toolbarItems = e.toolbarOptions.items ?? [];
    e.toolbarOptions.items = toolbarItems.map((item) => {
      if (typeof item !== 'string' && item.name === 'revertButton') {
        return {
          widget: 'dxButton',
          location: item.location,
          options: {
            icon: 'revert',
            hint: 'Undo the last change',
            elementAttr: { 'aria-label': 'Undo the last change' },
            disabled: this.changeHistoryHelper.getHistoryLength() === 0,
            onInitialized: (args: DxButtonTypes.InitializedEvent) => {
              this.undoButton = args.component;
            },
            onClick: () => {
              this.changeHistoryHelper.undoLastChange(e.component);
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
        onInitialized: (args: DxButtonTypes.InitializedEvent) => {
          this.clearHistoryButton = args.component;
        },
        onClick: () => {
          this.changeHistoryHelper.clearHistory(e.component);
        },
      },
    });
  }

  onOptionChanged(e: DxDataGridTypes.OptionChangedEvent): void {
    if (e.fullName === 'editing.changes' && Array.isArray(e.value)
      && !this.changeHistoryHelper.isUndoInProgress()) {
      this.changeHistoryHelper.recordChanges(e.value);
    }
  }

  onSaved(): void {
    this.changeHistoryHelper.resetHistory();
  }

  onMaxUndoStepsChanged(e: DxNumberBoxTypes.ValueChangedEvent): void {
    const value = Number.isFinite(e.value) ? Math.floor(e.value) : 50;
    const limit = Math.max(0, Math.min(1000, value));
    if (e.value !== limit) {
      e.component.option('value', limit);
      return;
    }
    this.changeHistoryHelper.setMaxUndoSteps(limit);
  }

  onUndoTypesChanged(e: DxTagBoxTypes.ValueChangedEvent): void {
    const newValue = e.value as typeof this.undoTypes;
    const itemsAdded = newValue.some((item) => !this.previousUndoTypes.includes(item));

    this.changeHistoryHelper.setUndoTypes(newValue);
    if (itemsAdded) {
      this.grid?.cancelEditData();
    }
    this.previousUndoTypes = [...newValue];
  }

  private updateControlsState(): void {
    this.undoButton?.option('disabled', this.changeHistoryHelper.getHistoryLength() === 0);
    this.clearHistoryButton?.option('disabled', this.grid ? !this.grid.hasEditData() : true);
  }
}
