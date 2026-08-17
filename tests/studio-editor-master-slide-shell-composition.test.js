const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-master-slide-shell-composition.js');

test('master-slide shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { saveActiveSlide() {} };
  const runtime = { masterSlideController: controller };
  const accessorsApi = {
    createStudioEditorMasterSlideRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const masterSlideRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalStateApi: { name: 'canonical-state' },
    renderApi: { name: 'render' }
  };
  const getCanonicalDeck = () => null;

  const result = composition.createStudioEditorMasterSlideShellComposition({
    accessorsApi,
    runtimeApi,
    masterSlideRuntimeApi,
    ...dependencies,
    runtimeOptions: { getCanonicalDeck }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.masterSlideRuntimeApi, masterSlideRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getCanonicalDeck, getCanonicalDeck);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('master-slide shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorMasterSlideShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
