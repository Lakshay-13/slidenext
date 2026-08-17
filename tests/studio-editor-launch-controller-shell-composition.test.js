const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-launch-controller-shell-composition.js');

test('launch controller shell composition resolves runtime accessors and preserves launch options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    documentRef: { id: 'document' },
    getCurrentPresentationUrl: () => '/presentations/example/index.html',
    setFrameSource: () => {}
  };
  const runtime = { launch() {} };
  const accessorsApi = {
    createStudioEditorLaunchControllerRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { createStudioEditorLaunchController() {} };

  const result = composition.createStudioEditorLaunchControllerShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('launch controller shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLaunchControllerShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
