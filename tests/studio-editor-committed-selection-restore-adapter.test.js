const test = require('node:test');
const assert = require('node:assert/strict');

const committedSelectionRestoreAdapter = require('../shared/studio-editor-committed-selection-restore-adapter.js');

test('restoreStudioEditorCommittedSelectionByIdsOnActiveSlide composes restore dependencies', () => {
  const selectedIds = ['node-1'];
  const doc = { id: 'doc' };
  const selectionOptions = { selectionOptions: true };
  const callbacks = {
    applySelectionState() {},
    syncSelectionOverlay() {},
    hideDragHud() {},
    syncInspectorForSelection() {},
    updateLayersList() {}
  };
  const restoredState = { restored: true };
  let delegated = null;

  const result = committedSelectionRestoreAdapter.restoreStudioEditorCommittedSelectionByIdsOnActiveSlide(
    selectedIds,
    doc,
    {
      selectionApi: {
        restoreCommittedStudioSelectionByIdsOnActiveSlide(ids, currentDoc, options) {
          delegated = { ids, currentDoc, options };
          return restoredState;
        }
      },
      getSelectionOptions: () => selectionOptions,
      ...callbacks,
      hideDragHudOnClear: true
    }
  );

  assert.equal(result, restoredState);
  assert.equal(delegated.ids, selectedIds);
  assert.equal(delegated.currentDoc, doc);
  assert.deepEqual(delegated.options, {
    selectionOptions: true,
    ...callbacks,
    hideDragHudOnClear: true
  });
});

test('restoreStudioEditorCommittedSelectionByIdsOnActiveSlide fails closed without the shared selection API', () => {
  assert.equal(
    committedSelectionRestoreAdapter.restoreStudioEditorCommittedSelectionByIdsOnActiveSlide([], {}, {}),
    null
  );
});
