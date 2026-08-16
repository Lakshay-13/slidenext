const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-history-controller-shell-runtime.js');

test('history controller shell runtime delegates prepared history options', () => {
  let receivedOptions = null;
  const runtimeOptions = { name: 'history-options' };
  const historyRuntimeApi = {
    createStudioEditorHistoryControllerRuntime(options) {
      receivedOptions = options;
      return { name: 'history-runtime' };
    }
  };

  const result = shellRuntime.createStudioEditorHistoryControllerShellRuntime({
    historyRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { name: 'history-runtime' });
  assert.equal(receivedOptions, runtimeOptions);
});

test('history controller shell runtime accepts flattened options from the runtime accessors', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getDocument: () => null,
    historyStateApi: { name: 'history-state' }
  };
  const historyRuntimeApi = {
    createStudioEditorHistoryControllerRuntime(options) {
      receivedOptions = options;
      return { name: 'history-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorHistoryControllerShellRuntime({
      historyRuntimeApi,
      ...runtimeOptions
    }),
    { name: 'history-runtime' }
  );
  assert.deepEqual(receivedOptions, {
    getDocument: runtimeOptions.getDocument,
    historyStateApi: runtimeOptions.historyStateApi,
    historyRuntimeApi
  });
});

test('history controller shell runtime safely handles missing options or factory', () => {
  let receivedOptions = null;
  const historyRuntimeApi = {
    createStudioEditorHistoryControllerRuntime(options) {
      receivedOptions = options;
      return null;
    }
  };

  assert.equal(
    shellRuntime.createStudioEditorHistoryControllerShellRuntime({ historyRuntimeApi }),
    null
  );
  assert.deepEqual(receivedOptions, { historyRuntimeApi });
  assert.equal(shellRuntime.createStudioEditorHistoryControllerShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorHistoryControllerShellRuntime({ historyRuntimeApi: {} }),
    null
  );
});
