const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-block-shell-composition.js');

test('block shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { save() {} };
  const runtime = { blockController: controller };
  const accessorsApi = {
    createStudioEditorBlockRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const blockRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalStateApi: { name: 'canonical-state' },
    renderApi: { name: 'render' },
    transactionApi: { name: 'transaction' }
  };
  const getCanonicalDeck = () => null;

  const result = composition.createStudioEditorBlockShellComposition({
    accessorsApi,
    runtimeApi,
    blockRuntimeApi,
    ...dependencies,
    runtimeOptions: { getCanonicalDeck }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.blockRuntimeApi, blockRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getCanonicalDeck, getCanonicalDeck);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('block shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorBlockShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
