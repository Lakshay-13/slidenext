const test = require('node:test');
const assert = require('node:assert/strict');

const inspectorController = require('../shared/studio-editor-inspector-controller.js');

test('syncStudioInspectorActionStates preserves the inspector toolbar refresh order', () => {
  const calls = [];
  const actionNames = [
    'updateClipboardActionState',
    'updateRemovalActionState',
    'updateLockActionState',
    'updateVisibilityActionState',
    'updateMotionActionState',
    'updateAlignmentActionState',
    'updateGroupActionState',
    'updateStyleActionState',
    'updateLayerOrderActionState'
  ];

  const options = {};
  actionNames.forEach((name) => {
    options[name] = () => calls.push(name);
  });

  assert.equal(inspectorController.syncStudioInspectorActionStates(options), true);
  assert.deepEqual(calls, actionNames);
});

test('syncStudioInspectorActionStates tolerates optional toolbar callbacks', () => {
  const calls = [];

  assert.equal(inspectorController.syncStudioInspectorActionStates({
    updateClipboardActionState() {
      calls.push('clipboard');
    },
    updateLayerOrderActionState() {
      calls.push('layer-order');
    }
  }), true);
  assert.deepEqual(calls, ['clipboard', 'layer-order']);
});

test('syncStudioInspectorSelection delegates live selection rendering to the shared view', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const selectionState = { hasSelection: true, count: 1 };
  const rgbToHex = () => '#fff';
  const highlightAlignButton = () => {};

  assert.equal(inspectorController.syncStudioInspectorSelection({
    documentRef,
    selectionState,
    inspectorView: {
      syncStudioInspectorSelection(options) {
        calls.push(options);
        return true;
      }
    },
    rgbToHex,
    highlightAlignButton
  }), true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].selectionState, selectionState);
  assert.equal(calls[0].rgbToHex, rgbToHex);
  assert.equal(calls[0].highlightAlignButton, highlightAlignButton);
});

test('syncStudioInspectorSelection returns false when no selection is rendered', () => {
  assert.equal(inspectorController.syncStudioInspectorSelection({
    documentRef: {},
    selectionState: { hasSelection: false },
    inspectorView: {
      renderStudioInspectorSelectionSummary() {
        return { hasSelection: false };
      }
    }
  }), false);
});
