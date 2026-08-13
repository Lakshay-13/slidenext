const test = require('node:test');
const assert = require('node:assert/strict');

const editableTargetAdapter = require('../shared/studio-editor-editable-target-adapter.js');

test('resolveStudioEditorEditableTarget delegates the node and options', () => {
  const node = { id: 'event-target' };
  const domOptions = { selectableSelector: '[data-editor-id]' };
  const target = { id: 'editable-target' };
  let delegated = null;

  const result = editableTargetAdapter.resolveStudioEditorEditableTarget(node, {
    domApi: {
      resolveStudioEditableTarget(nodeValue, optionsValue) {
        delegated = { nodeValue, optionsValue };
        return target;
      }
    },
    domOptions
  });

  assert.equal(result, target);
  assert.equal(delegated.nodeValue, node);
  assert.equal(delegated.optionsValue, domOptions);
});

test('editable-target adapter prefers an explicit resolver', () => {
  const options = {
    domApi: {
      resolveStudioEditableTarget() {
        throw new Error('DOM target fallback should not run');
      }
    },
    targetResolver: () => ({ id: 'explicit-target' }),
    domOptions: {}
  };

  assert.deepEqual(
    editableTargetAdapter.resolveStudioEditorEditableTarget({}, options),
    { id: 'explicit-target' }
  );
});

test('editable-target adapter fails closed without the requested operation', () => {
  assert.equal(editableTargetAdapter.resolveStudioEditorEditableTarget({}), null);
});
