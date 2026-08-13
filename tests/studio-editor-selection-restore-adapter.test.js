const test = require('node:test');
const assert = require('node:assert/strict');

const selectionRestoreAdapter = require('../shared/studio-editor-selection-restore-adapter.js');

test('restoreStudioEditorSelectionByIdsOnActiveSlide composes restore dependencies', () => {
  const selectedIds = ['node-1'];
  const doc = { id: 'doc' };
  const selectionOptions = { selectionOptions: true };
  const restoredState = { restored: true, selectedElements: [{ id: 'node-1' }] };
  let delegated = null;

  const result = selectionRestoreAdapter.restoreStudioEditorSelectionByIdsOnActiveSlide(
    selectedIds,
    doc,
    {
      selectionApi: {
        restoreStudioSelectionByIdsOnActiveSlide(ids, currentDoc, options) {
          delegated = { ids, currentDoc, options };
          return restoredState;
        }
      },
      getSelectionOptions: () => selectionOptions
    }
  );

  assert.equal(result, restoredState);
  assert.equal(delegated.ids, selectedIds);
  assert.equal(delegated.currentDoc, doc);
  assert.equal(delegated.options, selectionOptions);
});

test('restoreStudioEditorSelectionByIdsOnActiveSlide fails closed without the shared selection API', () => {
  assert.equal(
    selectionRestoreAdapter.restoreStudioEditorSelectionByIdsOnActiveSlide([], {}, {}),
    null
  );
});
