const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-selection-ui-mutation-runtime-accessors.js');

test('selection UI mutation runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, sync() {} };
  const runtimeApi = {
    createStudioEditorSelectionUiMutationShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    selectionApi: { syncStudioSelectionUiAfterMutation() {} }
  };

  const result = accessors.createStudioEditorSelectionUiMutationRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('selection UI mutation runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorSelectionUiMutationRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorSelectionUiMutationRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
