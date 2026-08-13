const test = require('node:test');
const assert = require('node:assert/strict');

const preservedSelectionRestoreAdapter = require('../shared/studio-editor-preserved-selection-restore-adapter.js');

test('restoreStudioEditorPreservedSelectionAfterSlideMutation composes restore dependencies', () => {
  const selectedIds = ['node-1'];
  const doc = { id: 'doc' };
  const selectionOptions = { selectionOptions: true };
  const callbacks = {
    applySelectionState() {},
    syncSelectionOverlay() {},
    hideDragHud() {},
    syncInspectorForSelection() {},
    updateLayersList() {},
    preserveSelection() {}
  };
  const restoredState = { restored: true };
  let delegated = null;

  const result = preservedSelectionRestoreAdapter.restoreStudioEditorPreservedSelectionAfterSlideMutation(
    selectedIds,
    doc,
    {
      selectionApi: {
        restoreStudioSelectionAfterSlideMutation(ids, currentDoc, options) {
          delegated = { ids, currentDoc, options };
          return restoredState;
        }
      },
      getSelectionOptions: () => selectionOptions,
      ...callbacks
    }
  );

  assert.equal(result, restoredState);
  assert.equal(delegated.ids, selectedIds);
  assert.equal(delegated.currentDoc, doc);
  assert.deepEqual(delegated.options, {
    selectionOptions: true,
    ...callbacks
  });
});

test('restoreStudioEditorPreservedSelectionAfterSlideMutation fails closed without the shared selection API', () => {
  assert.equal(
    preservedSelectionRestoreAdapter.restoreStudioEditorPreservedSelectionAfterSlideMutation([], {}, {}),
    null
  );
});
