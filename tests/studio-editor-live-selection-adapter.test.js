const test = require('node:test');
const assert = require('node:assert/strict');

const liveSelectionAdapter = require('../shared/studio-editor-live-selection-adapter.js');

test('getStudioEditorLiveSelection delegates with built selection options', () => {
  const elements = [{ id: 'node-1' }];
  const selectionOptions = { selectionOptions: true };
  let delegated = null;

  const result = liveSelectionAdapter.getStudioEditorLiveSelection(elements, {
    selectionApi: {
      getStudioLiveSelection(currentElements, options) {
        delegated = { currentElements, options };
        return elements;
      }
    },
    getSelectionOptions: () => selectionOptions
  });

  assert.equal(result, elements);
  assert.equal(delegated.currentElements, elements);
  assert.equal(delegated.options, selectionOptions);
});

test('getStudioEditorLiveSelection fails closed without the shared API', () => {
  assert.equal(liveSelectionAdapter.getStudioEditorLiveSelection([], {}), null);
});
