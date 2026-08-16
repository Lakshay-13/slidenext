const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-version-history-runtime-accessors.js');

test('version history runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, versionHistoryController: { load() {} } };
  const runtimeApi = {
    createStudioEditorVersionHistoryShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getPresentationUrl: () => '',
    getSessionToken: () => 0,
    reportLoadError: () => {}
  };

  const result = accessors.createStudioEditorVersionHistoryRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('version history runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorVersionHistoryRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorVersionHistoryRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
