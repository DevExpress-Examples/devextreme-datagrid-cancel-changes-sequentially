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
  readonly defaultMaxUndoSteps = 50;
  readonly undoTypes = Object.values(DataChangeType);
  readonly revertButtonOptions = { icon: 'trash' };
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
    maxUndoSteps: this.defaultMaxUndoSteps,
    undoTypes: this.undoTypes,
    onHistoryChanged: () => this.updateControlsState(),
  });
  readonly undoButtonOptions: DxButtonTypes.Properties = {
    icon: 'revert',
    hint: 'Undo the last change',
    elementAttr: { 'aria-label': 'Undo the last change' },
    disabled: true,
    onInitialized: (e) => {
      this.undoButton = e.component;
    },
    onClick: () => {
      if (this.grid) {
        this.changeHistoryHelper.undoLastChange(this.grid);
      }
    },
  };

  private grid?: DataGrid;
  private undoButton?: Button;

  @HostListener('document:keydown', ['$event'])
  handleUndoKeyDown(event: KeyboardEvent): void {
    if (this.changeHistoryHelper.getHistoryLength() > 0
      && event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
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

  onOptionChanged(e: DxDataGridTypes.OptionChangedEvent): void {
    if (e.fullName !== 'editing.changes' || !Array.isArray(e.value)
      || this.changeHistoryHelper.isUndoInProgress()) {
      return;
    }
    if (e.value.length === 0) {
      this.changeHistoryHelper.resetHistory();
    } else {
      this.changeHistoryHelper.recordChanges(e.value);
    }
  }

  onSaved(): void {
    this.changeHistoryHelper.resetHistory();
  }

  onMaxUndoStepsChanged(e: DxNumberBoxTypes.ValueChangedEvent): void {
    const value = Number.isFinite(e.value) ? Math.floor(e.value) : this.defaultMaxUndoSteps;
    const limit = Math.max(0, Math.min(1000, value));
    if (e.value !== limit) {
      e.component.option('value', limit);
      return;
    }
    this.changeHistoryHelper.setMaxUndoSteps(limit);
  }

  onUndoTypesChanged(e: DxTagBoxTypes.ValueChangedEvent): void {
    const newValue = e.value as typeof this.undoTypes;
    const itemsAdded = newValue.some((item) => !e.previousValue.includes(item));

    this.changeHistoryHelper.setUndoTypes(newValue);
    if (itemsAdded) {
      this.grid?.cancelEditData();
    }
  }

  private updateControlsState(): void {
    this.undoButton?.option('disabled', this.changeHistoryHelper.getHistoryLength() === 0);
  }
}
