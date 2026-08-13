const test = require('node:test');
const assert = require('node:assert/strict');

const selectionCommitAdapter = require('../shared/studio-editor-selection-commit-adapter.js');

test('commitStudioEditorSelectionState composes selection callbacks and options', () => {
  const nextSelectionState = { selectedElements: [{ id: 'node-1' }] };
  const callbacks = {
    applySelectionState() {},
    refreshSelectionClasses() {},
    syncSelectionOverlay() {},
    syncInspectorForSelection() {},
    updateLayersList() {}
  };
  let delegated = null;

  const result = selectionCommitAdapter.commitStudioEditorSelectionState(nextSelectionState, {
    selectionApi: {
      commitStudioSelectionState(state, options) {
        delegated = { state, options };
        return { committed: true };
      }
    },
    getSelectionOptions: () => ({ selectionOptions: true }),
    ...callbacks,
    commitOptions: { doc: { id: 'doc' } }
  });

  assert.deepEqual(result, { committed: true });
  assert.equal(delegated.state, nextSelectionState);
  assert.deepEqual(delegated.options.selectionOptions, true);
  assert.equal(delegated.options.doc.id, 'doc');
  Object.entries(callbacks).forEach(([name, callback]) => {
    assert.equal(delegated.options[name], callback);
  });
});

test('commitStudioEditorSelectionState fails closed without the shared selection API', () => {
  assert.equal(
    selectionCommitAdapter.commitStudioEditorSelectionState({}, {}),
    false
  );
});
