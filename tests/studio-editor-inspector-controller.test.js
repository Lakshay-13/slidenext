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
