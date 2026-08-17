const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-frame-shell-composition.js');

test('frame shell composition resolves runtime dependencies and preserves options', () => {
  let receivedOptions = null;
  const runtime = { frameController: { name: 'frame' } };
  const accessorsApi = {
    createStudioEditorFrameRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeOptions = { getIframeDocument: () => null };
  const runtimeApi = { name: 'shell-runtime' };
  const frameRuntimeApi = { name: 'frame-runtime' };

  const result = composition.createStudioEditorFrameShellComposition({
    accessorsApi,
    runtimeApi,
    frameRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.frameRuntimeApi, frameRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDocument, runtimeOptions.getIframeDocument);
});

test('frame shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorFrameShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
