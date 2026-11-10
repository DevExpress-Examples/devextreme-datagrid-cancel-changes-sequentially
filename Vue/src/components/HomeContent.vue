<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import 'devextreme/dist/css/dx.fluent.blue.light.css';
import {
  DxColumn,
  DxDataGrid,
  DxEditing,
  DxItem,
  DxRequiredRule,
  DxStringLengthRule,
  DxToolbar,
} from 'devextreme-vue/data-grid';
import DxNumberBox from 'devextreme-vue/number-box';
import DxTagBox from 'devextreme-vue/tag-box';
import type dxDataGrid from 'devextreme/ui/data_grid';
import type { InitializedEvent, OptionChangedEvent } from 'devextreme/ui/data_grid';
import type { ValueChangedEvent as NumberBoxValueChangedEvent } from 'devextreme/ui/number_box';
import type { ValueChangedEvent as TagBoxValueChangedEvent } from 'devextreme/ui/tag_box';
import { createStore } from 'devextreme-aspnet-data-nojquery';
import { DataChangeType, EditHistoryHelper } from '../edit-history-helper';

const apiUrl = 'https://js.devexpress.com/Demos/Mvc/api/DataGridWebApi';
const defaultMaxUndoSteps = 50;
const undoTypes = Object.values(DataChangeType);
type UndoTypes = typeof undoTypes;
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

let gridInstance: dxDataGrid | undefined;
const maxUndoSteps = ref(defaultMaxUndoSteps);
const selectedUndoTypes = ref<UndoTypes>([...undoTypes]);
const historyLength = ref(0);
const changeHistoryHelper = new EditHistoryHelper({
  maxUndoSteps: defaultMaxUndoSteps,
  undoTypes: [...undoTypes],
  onHistoryChanged: (length) => {
    historyLength.value = length;
  },
});

function undoLastChange(): void {
  if (gridInstance) {
    changeHistoryHelper.undoLastChange(gridInstance);
  }
}

function handleUndoKeyDown(event: KeyboardEvent): void {
  if (historyLength.value > 0
    && event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoLastChange();
  }
}

onMounted(() => document.addEventListener('keydown', handleUndoKeyDown));
onBeforeUnmount(() => document.removeEventListener('keydown', handleUndoKeyDown));

function onGridInitialized(event: InitializedEvent): void {
  gridInstance = event.component;
}

function onGridOptionChanged(event: OptionChangedEvent): void {
  if (event.fullName !== 'editing.changes' || !Array.isArray(event.value)
    || changeHistoryHelper.isUndoInProgress()) {
    return;
  }
  if (event.value.length === 0) {
    changeHistoryHelper.resetHistory();
  } else {
    changeHistoryHelper.recordChanges(event.value);
  }
}

function onGridSaved(): void {
  changeHistoryHelper.resetHistory();
}

function handleMaxUndoStepsChanged(event: NumberBoxValueChangedEvent): void {
  const value = Number.isFinite(event.value) ? Math.floor(event.value) : defaultMaxUndoSteps;
  const limit = Math.max(0, Math.min(1000, value));
  maxUndoSteps.value = limit;
  changeHistoryHelper.setMaxUndoSteps(limit);
}

function handleUndoTypesChanged(event: TagBoxValueChangedEvent): void {
  const newValue = event.value as UndoTypes;
  const itemsAdded = newValue.some((item) => !event.previousValue.includes(item));

  selectedUndoTypes.value = newValue;
  changeHistoryHelper.setUndoTypes(newValue);
  if (itemsAdded) {
    gridInstance?.cancelEditData();
  }
}

const undoButtonOptions = computed(() => ({
  icon: 'revert',
  hint: 'Undo the last change',
  elementAttr: { 'aria-label': 'Undo the last change' },
  disabled: historyLength.value === 0,
  onClick: undoLastChange,
}));
</script>
<template>
  <main class="demo-container">
    <DxDataGrid
      class="orders-grid"
      :data-source="dataSource"
      :show-borders="true"
      :repaint-changes-only="true"
      @initialized="onGridInitialized"
      @option-changed="onGridOptionChanged"
      @saved="onGridSaved"
    >
      <DxEditing
        mode="batch"
        :allow-adding="true"
        :allow-deleting="true"
        :allow-updating="true"
      />
      <DxToolbar>
        <DxItem name="addRowButton"/>
        <DxItem name="saveButton"/>
        <DxItem
          location="after"
          widget="dxButton"
          :options="undoButtonOptions"
        />
        <DxItem
          name="revertButton"
          :options="revertButtonOptions"
        />
      </DxToolbar>
      <DxColumn
        data-field="OrderID"
        :width="110"
        :allow-editing="false"
      />
      <DxColumn
        data-field="OrderDate"
        data-type="date"
        :width="130"
      >
        <DxRequiredRule message="Order Date is required."/>
      </DxColumn>
      <DxColumn
        data-field="ShipName"
        :width="340"
        :editor-options="shipNameEditorOptions"
      >
        <DxStringLengthRule
          :max="40"
          message="Ship Name must not exceed 40 characters."
        />
      </DxColumn>
      <DxColumn
        data-field="ShipCountry"
        :width="220"
        :editor-options="shipCountryEditorOptions"
      >
        <DxStringLengthRule
          :max="15"
          message="Ship Country must not exceed 15 characters."
        />
      </DxColumn>
    </DxDataGrid>

    <section class="options">
      <div class="caption">Options</div>
      <div class="option">
        <label
          id="max-undo-label"
          for="max-undo-steps"
        >Maximum undo steps</label>
        <DxNumberBox
          id="max-undo-steps"
          :value="maxUndoSteps"
          :width="120"
          :min="0"
          :max="1000"
          :step="1"
          format="#0"
          :show-spin-buttons="true"
          :input-attr="maxUndoInputAttributes"
          @value-changed="handleMaxUndoStepsChanged"
        />
      </div>
      <div class="option">
        <label
          id="undo-types-label"
          for="undo-types"
        >Undo edit types</label>
        <DxTagBox
          id="undo-types"
          :width="250"
          :items="undoTypes"
          :value="selectedUndoTypes"
          :show-selection-controls="true"
          :show-clear-button="true"
          :input-attr="undoTypesInputAttributes"
          @value-changed="handleUndoTypesChanged"
        />
      </div>
    </section>
  </main>
</template>
