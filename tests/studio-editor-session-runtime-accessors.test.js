const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-session-runtime-accessors.js');

test('session runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { sessionStateController: { name: 'session' } };
  const runtimeApi = {
    createStudioEditorSessionShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const sessionRuntimeApi = { name: 'session-runtime' };
  const runtimeOptions = {
    getPresentationUrl: () => '/presentations/example/index.html',
    clearHistoryStacks: () => {}
  };

  const result = accessors.createStudioEditorSessionRuntimeAccessors({
    runtimeApi,
    sessionRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    sessionRuntimeApi
  });
});

test('session runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorSessionRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorSessionRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
