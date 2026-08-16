const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-shell-state-runtime-accessors.js');

test('shell state runtime accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { sessionStateBridge: {} };
  const runtimeApi = {
    createStudioEditorShellStateRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocument: () => null,
    historyBridgeApi: { name: 'history-bridge' },
    versionRenameStateAccessorsApi: { name: 'rename-accessors' }
  };

  const result = accessors.createStudioEditorShellStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('shell state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorShellStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorShellStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
