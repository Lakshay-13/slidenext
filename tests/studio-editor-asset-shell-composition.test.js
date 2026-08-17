const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-asset-shell-composition.js');

test('asset shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { addAsset() {} };
  const runtime = { assetController: controller };
  const accessorsApi = {
    createStudioEditorAssetRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const assetRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalStateApi: { name: 'canonical-state' }
  };
  const getCanonicalDeck = () => null;

  const result = composition.createStudioEditorAssetShellComposition({
    accessorsApi,
    runtimeApi,
    assetRuntimeApi,
    ...dependencies,
    runtimeOptions: { getCanonicalDeck }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.assetRuntimeApi, assetRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getCanonicalDeck, getCanonicalDeck);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('asset shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorAssetShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
