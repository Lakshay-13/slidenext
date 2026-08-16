const test = require('node:test');
const assert = require('node:assert/strict');

const editableTargetAccessors = require('../shared/studio-editor-editable-target-accessors.js');

test('editable-target accessors resolve the DOM adapter and shared options', () => {
  const calls = [];
  const node = { id: 'event-target' };
  const target = { id: 'editable-target' };
  const domApi = { name: 'dom-api' };
  const accessors = editableTargetAccessors.createStudioEditorEditableTargetAccessors({
    editableTargetAdapter: {
      resolveStudioEditorEditableTarget(nodeValue, options) {
        calls.push([nodeValue, options]);
        return target;
      }
    },
    domApi,
    getDomOptions: (overrides = {}) => ({
      selectableSelector: '[data-editor-id]',
      ...overrides
    })
  });

  assert.equal(accessors.resolveEditableTarget(node, { includeText: true }), target);
  assert.deepEqual(calls, [[node, {
    domApi,
    domOptions: {
      selectableSelector: '[data-editor-id]',
      includeText: true
    }
  }]]);
});

test('editable-target accessors fail closed when the adapter is unavailable', () => {
  const accessors = editableTargetAccessors.createStudioEditorEditableTargetAccessors({
    editableTargetAdapter: null
  });

  assert.equal(accessors.resolveEditableTarget({}), null);
});
