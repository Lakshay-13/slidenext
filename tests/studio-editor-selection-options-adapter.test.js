const test = require('node:test');
const assert = require('node:assert/strict');

const selectionOptionsAdapter = require('../shared/studio-editor-selection-options-adapter.js');

test('buildStudioEditorSelectionOptions composes shared selection options', () => {
  const selectionOptions = { doc: { id: 'doc' }, activeSlide: { id: 'slide' } };
  let delegated = null;

  const result = selectionOptionsAdapter.buildStudioEditorSelectionOptions({
    selectionApi: {
      buildStudioEditorSelectionOptions(options) {
        delegated = options;
        return { ...options, shared: true };
      }
    },
    selectionOptions
  });

  assert.deepEqual(result, { ...selectionOptions, shared: true });
  assert.equal(delegated, selectionOptions);
});

test('buildStudioEditorSelectionOptions fails closed without the shared selection API', () => {
  assert.equal(selectionOptionsAdapter.buildStudioEditorSelectionOptions({}), null);
});
