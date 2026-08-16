const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-frame-runtime-accessors.js');

test('frame runtime accessors delegate shell construction and preserve prepared options', () => {
  let receivedOptions = null;
  const runtimeValue = { frameController: { name: 'frame' } };
  const runtimeApi = {
    createStudioEditorFrameShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const frameRuntimeApi = { name: 'frame-runtime' };
  const runtimeOptions = {
    frameControllerApi: { name: 'controller' },
    getIframeDocument: () => null
  };

  const result = accessors.createStudioEditorFrameRuntimeAccessors({
    runtimeApi,
    frameRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    frameRuntimeApi
  });
});

test('frame runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorFrameRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorFrameRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
