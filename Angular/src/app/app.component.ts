import {
  ChangeDetectionStrategy, Component, HostListener, inject, signal, viewChild,
} from '@angular/core';
import { DxButtonModule } from 'devextreme-angular/ui/button';
import { DxDataGridComponent, DxDataGridModule } from 'devextreme-angular/ui/data-grid';
import { DxNumberBoxModule, DxNumberBoxTypes } from 'devextreme-angular/ui/number-box';
import { DxTagBoxModule, DxTagBoxTypes } from 'devextreme-angular/ui/tag-box';
import { createStore } from 'devextreme-aspnet-data-nojquery';
import { DataChangeType, EditHistoryService } from './edit-history.service';

const apiUrl = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';

@Component({
  selector: 'app-root',
  imports: [DxButtonModule, DxDataGridModule, DxNumberBoxModule, DxTagBoxModule],
  providers: [EditHistoryService],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly defaultMaxUndoSteps = 50;
  readonly undoTypes = Object.values(DataChangeType);
  readonly maxUndoSteps = signal(this.defaultMaxUndoSteps);
  readonly selectedUndoTypes = signal([...this.undoTypes]);
  readonly editHistory = inject(EditHistoryService);
  private readonly grid = viewChild(DxDataGridComponent);
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

  @HostListener('document:keydown', ['$event'])
  handleUndoKeyDown(event: KeyboardEvent): void {
    if (this.editHistory.historyLength() > 0
      && event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.editHistory.undoLastChange();
    }
  }

  onMaxUndoStepsChanged(e: DxNumberBoxTypes.ValueChangedEvent): void {
    const value = Number.isFinite(e.value) ? Math.floor(e.value) : this.defaultMaxUndoSteps;
    const limit = Math.max(0, Math.min(1000, value));
    this.maxUndoSteps.set(limit);
    this.editHistory.setMaxUndoSteps(limit);
  }

  onUndoTypesChanged(e: DxTagBoxTypes.ValueChangedEvent): void {
    const newValue = e.value as typeof this.undoTypes;
    const itemsAdded = newValue.some((item) => !e.previousValue.includes(item));

    this.selectedUndoTypes.set(newValue);
    this.editHistory.setUndoTypes(newValue);
    if (itemsAdded) {
      this.grid()?.instance.cancelEditData();
    }
  }
}
