const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-layer-order-state-shell-composition.js');

test('layer order state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const runtime = { isAvailable: true, layerOrderStateController: controller };
  const accessorsApi = {
    createStudioEditorLayerOrderStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const layerOrderStateApi = { name: 'layer-order-state' };
  const layerOrderApi = { name: 'layer-order' };
  const getDocument = () => null;

  const result = composition.createStudioEditorLayerOrderStateShellComposition({
    accessorsApi,
    runtimeApi,
    layerOrderStateApi,
    layerOrderApi,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.layerOrderStateApi, layerOrderStateApi);
  assert.equal(receivedOptions.runtimeOptions.layerOrderApi, layerOrderApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('layer order state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLayerOrderStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
