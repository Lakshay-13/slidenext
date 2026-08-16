const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-history-controller-runtime-accessors.js');

test('history controller runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { historyController: { name: 'history' } };
  const runtimeApi = {
    createStudioEditorHistoryControllerShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const historyRuntimeApi = { name: 'history-runtime' };
  const runtimeOptions = {
    getUndoStack: () => [],
    triggerAutoSave: () => {}
  };

  const result = accessors.createStudioEditorHistoryControllerRuntimeAccessors({
    runtimeApi,
    historyRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    historyRuntimeApi
  });
});

test('history controller runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorHistoryControllerRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorHistoryControllerRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
