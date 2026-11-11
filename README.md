<!-- default badges list -->
![](https://img.shields.io/endpoint?url=https://codecentral.devexpress.com/api/v1/VersionRange/340354634/26.1.3%2B)
[![](https://img.shields.io/badge/Open_in_DevExpress_Support_Center-FF7200?style=flat-square&logo=DevExpress&logoColor=white)](https://supportcenter.devexpress.com/ticket/details/T1129779)
[![](https://img.shields.io/badge/📖_How_to_use_DevExpress_Examples-e9f6fc?style=flat-square)](https://docs.devexpress.com/GeneralInformation/403183)
[![](https://img.shields.io/badge/💬_Leave_Feedback-feecdd?style=flat-square)](#does-this-example-address-your-development-requirementsobjectives)
<!-- default badges end -->
# DevExtreme DataGrid - Cancel Changes One by One

In batch edit mode, the DevExtreme [DataGrid](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/DataGrid/Overview/) accumulates user edits until they are saved. The built-in **Discard changes** toolbar button cancels all pending changes at once. This example adds an **Undo** button (and the <kbd>Ctrl</kbd>+<kbd>Z</kbd> shortcut) that reverts unsaved changes one step at a time, in the reverse order they were made.

![Example image](images/datagrid-undo-changes.png)

The example also includes an options panel where you can configure:

- **Maximum undo steps** – the number of edit steps stored in history (default: 50).
- **Undo edit types** – the change types that can be undone (`insert`, `remove`, `update`). Changes of excluded types are removed from history. When you add a type back, the grid discards all pending changes to keep history consistent.

## Implementation Details

The undo logic is encapsulated in a reusable `EditHistoryHelper` class.

1. Enable [batch editing](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/DataGrid/Editing/#User_Interaction/Batch_Mode): set [editing.mode](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/editing/#mode) to `batch`.

2. Track pending changes. Handle the [onOptionChanged](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/#onOptionChanged) event and call `recordChanges` each time the [editing.changes](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/editing/#changes) array is modified. The helper compares the new array with the previous snapshot, detects which row changed (by key), and pushes the row's previous state and change type to the history stack. When the array becomes empty (changes are discarded) or the [onSaved](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/#onSaved) event is raised, history is cleared.

    ```js
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
    },
    ```

3. Undo the last change. `undoLastChange` pops the last history entry and restores the row's previous state in `editing.changes` (or removes the row's change if it did not exist before). A flag prevents the resulting `optionChanged` call from being recorded as a new edit.

    ```js
    undoLastChange(grid) {
      const step = this.changesHistory.pop();
      if (!step) return;

      const changes = this.cloneChanges(grid.option('editing.changes'));
      const index = changes.findIndex((change) => this.getChangeKey(change) === step.key);
      if (index >= 0) changes.splice(index, 1);
      if (step.before) changes.splice(index >= 0 ? index : changes.length, 0, step.before);

      this.isUndoing = true;
      try {
        grid.option('editing.changes', changes);
        this.previousChanges = this.cloneChanges(changes);
      } finally {
        this.isUndoing = false;
        this.onHistoryChanged(this.changesHistory.length);
      }
    }
    ```

4. Add an **Undo** button to the grid [toolbar](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/toolbar/) next to the predefined `addRowButton`, `saveButton`, and `revertButton` items. The button is disabled when history is empty (the helper's `onHistoryChanged` callback updates its state). A `keydown` handler on the document calls the same method when a user presses <kbd>Ctrl</kbd>+<kbd>Z</kbd>.

## Files to Review

- **Angular**
    - [app.component.html](Angular/src/app/app.component.html)
    - [app.component.ts](Angular/src/app/app.component.ts)
    - [edit-history-helper.ts](Angular/src/app/edit-history-helper.ts)
- **React**
    - [App.tsx](React/src/App.tsx)
    - [edit-history-helper.ts](React/src/edit-history-helper.ts)
- **Vue**
    - [HomeContent.vue](Vue/src/components/HomeContent.vue)
    - [edit-history-helper.ts](Vue/src/edit-history-helper.ts)
- **jQuery**
    - [index.html](jQuery/src/index.html)
    - [index.js](jQuery/src/index.js)
    - [editHistoryHelper.js](jQuery/src/editHistoryHelper.js)
- **ASP.NET Core**
    - [Index.cshtml](ASP.NET%20Core/Views/Home/Index.cshtml)
    - [editHistoryHelper.js](ASP.NET%20Core/wwwroot/js/editHistoryHelper.js)
    - [DataGridWebApiController.cs](ASP.NET%20Core/Controllers/DataGridWebApiController.cs)

## Documentation

- [DataGrid - Batch Edit Mode](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/DataGrid/Editing/#User_Interaction/Batch_Mode)
- [editing.changes](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/editing/#changes)
- [toolbar](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Configuration/toolbar/)
- [cancelEditData()](https://js.devexpress.com/jQuery/Documentation/ApiReference/UI_Components/dxDataGrid/Methods/#cancelEditData)

## More Examples

- [DataGrid - Batch Editing Demo](https://js.devexpress.com/jQuery/Demos/WidgetsGallery/Demo/DataGrid/BatchEditing/)
<!-- feedback -->
## Does This Example Address Your Development Requirements/Objectives?

[<img src="https://www.devexpress.com/support/examples/i/yes-button.svg"/>](https://www.devexpress.com/support/examples/survey.xml?utm_source=github&utm_campaign=devextreme-examples-template&~~~was_helpful=yes) [<img src="https://www.devexpress.com/support/examples/i/no-button.svg"/>](https://www.devexpress.com/support/examples/survey.xml?utm_source=github&utm_campaign=devextreme-examples-template&~~~was_helpful=no)

(you will be redirected to DevExpress.com to submit your response)
<!-- feedback end -->
