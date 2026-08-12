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
  assert.deepEqual(receivedOptions, {});
  assert.equal(shellRuntime.createStudioEditorHistoryControllerShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorHistoryControllerShellRuntime({ historyRuntimeApi: {} }),
    null
  );
});
