const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-selection-composition-runtime-accessors.js');

test('selection composition runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, selectionCompositionController: { apply() {} } };
  const runtimeApi = {
    createStudioEditorSelectionCompositionShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocument: () => null,
    getSelectionOptions: () => ({})
  };

  const result = accessors.createStudioEditorSelectionCompositionRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('selection composition runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorSelectionCompositionRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorSelectionCompositionRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
