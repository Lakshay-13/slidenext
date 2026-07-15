const test = require('node:test');
const assert = require('node:assert/strict');

const studioSelection = require('../shared/studio-editor-selection.js');

test('syncStudioSelectionUiAfterMutation refreshes classes before selection chrome', () => {
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];

  const result = studioSelection.syncStudioSelectionUiAfterMutation(selectedElements, {
    refreshSelectionClasses() {
      calls.push('refreshSelectionClasses');
    },
    syncSelectionOverlay() {
      calls.push('syncSelectionOverlay');
    },
    syncInspectorForSelection() {
      calls.push('syncInspectorForSelection');
    },
    updateLayersList() {
      calls.push('updateLayersList');
    }
  });

  assert.equal(result, selectedElements);
  assert.deepEqual(calls, [
    'refreshSelectionClasses',
    'syncSelectionOverlay',
    'syncInspectorForSelection',
    'updateLayersList'
  ]);
});
