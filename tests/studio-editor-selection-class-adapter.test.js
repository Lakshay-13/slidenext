const test = require('node:test');
const assert = require('node:assert/strict');

const selectionClassAdapter = require('../shared/studio-editor-selection-class-adapter.js');

test('refreshStudioEditorSelectionClasses composes selection refresh dependencies', () => {
  const doc = { id: 'doc' };
  const selectedElements = [{ id: 'node-1' }];
  const selectionOptions = { selectionOptions: true };
  const refreshedState = { selectedElements, selectedElement: selectedElements[0] };
  let delegated = null;

  const result = selectionClassAdapter.refreshStudioEditorSelectionClasses(doc, selectedElements, {
    selectionApi: {
      refreshStudioSelectionClasses(currentDoc, currentElements, options) {
        delegated = { currentDoc, currentElements, options };
        return refreshedState;
      }
    },
    getSelectionOptions: () => selectionOptions
  });

  assert.equal(result, refreshedState);
  assert.equal(delegated.currentDoc, doc);
  assert.equal(delegated.currentElements, selectedElements);
  assert.equal(delegated.options, selectionOptions);
});

test('refreshStudioEditorSelectionClasses fails closed without the shared selection API', () => {
  assert.equal(
    selectionClassAdapter.refreshStudioEditorSelectionClasses({}, [], {}),
    null
  );
});
