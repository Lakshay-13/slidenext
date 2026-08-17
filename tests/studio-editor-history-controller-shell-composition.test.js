const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-history-controller-shell-composition.js');

test('history controller shell composition resolves runtime dependencies and preserves options', () => {
  let receivedOptions = null;
  const runtime = { historyController: { name: 'history' } };
  const accessorsApi = {
    createStudioEditorHistoryControllerRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeOptions = { getUndoStack: () => [] };
  const runtimeApi = { name: 'shell-runtime' };
  const historyRuntimeApi = { name: 'history-runtime' };

  const result = composition.createStudioEditorHistoryControllerShellComposition({
    accessorsApi,
    runtimeApi,
    historyRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.historyRuntimeApi, historyRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getUndoStack, runtimeOptions.getUndoStack);
});

test('history controller shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorHistoryControllerShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
