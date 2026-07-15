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

test('selectStudioElement resolves the target and commits additive selection state', () => {
  const currentSelection = [{ id: 'node-1' }];
  const target = { id: 'node-2' };
  const calls = [];

  assert.equal(studioSelection.selectStudioElement({
    element: { id: 'raw-node' },
    selectedElements: currentSelection,
    additive: true,
    resolveEditableTarget(element) {
      calls.push(['resolveEditableTarget', element]);
      return target;
    },
    getSelectionOptions() {
      calls.push(['getSelectionOptions']);
      return {};
    },
    commitSelectionState(nextSelectionState) {
      calls.push(['commitSelectionState', nextSelectionState]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'resolveEditableTarget',
    'getSelectionOptions',
    'commitSelectionState'
  ]);
  assert.deepEqual(calls[2][1], {
    selectedElements: [currentSelection[0], target],
    selectedElement: currentSelection[0]
  });
});

test('selectStudioElement skips commit when the target is not editable', () => {
  const calls = [];

  assert.equal(studioSelection.selectStudioElement({
    element: { id: 'raw-node' },
    resolveEditableTarget() {
      calls.push('resolveEditableTarget');
      return null;
    },
    commitSelectionState() {
      calls.push('commitSelectionState');
    }
  }), false);
  assert.deepEqual(calls, ['resolveEditableTarget']);
});
