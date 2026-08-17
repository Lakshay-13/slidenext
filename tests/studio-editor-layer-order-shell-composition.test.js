const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-layer-order-shell-composition.js');

test('layer order shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { arrange() {} };
  const runtime = { layerOrderController: controller };
  const accessorsApi = {
    createStudioEditorLayerOrderRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const layerOrderRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    layerOrderApi: { name: 'layer-order' },
    canonicalLayoutApi: { name: 'canonical-layout' },
    canonicalDeckApi: { name: 'canonical-deck' },
    layerOrderTransactionApi: { name: 'layer-order-transaction' },
    layerOrderMutationApi: { name: 'layer-order-mutation' },
    transactionApi: { name: 'transaction' }
  };
  const getActiveSlide = () => null;

  const result = composition.createStudioEditorLayerOrderShellComposition({
    accessorsApi,
    runtimeApi,
    layerOrderRuntimeApi,
    ...dependencies,
    runtimeOptions: { getActiveSlide }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.layerOrderRuntimeApi, layerOrderRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getActiveSlide, getActiveSlide);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('layer order shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLayerOrderShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
