const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-layer-order-shell-runtime.js');

test('layer order shell runtime resolves controller and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'layer-order-runtime' };
  const layerOrderRuntimeApi = {
    createStudioEditorLayerOrderRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    layerOrderApi: { name: 'layer-order' },
    canonicalLayoutApi: { name: 'layout' },
    canonicalDeckApi: { name: 'deck' },
    layerOrderTransactionApi: { name: 'layer-transaction' },
    layerOrderMutationApi: { name: 'layer-mutation' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorLayerOrderShellRuntime({
    layerOrderRuntimeApi,
    ...dependencies,
    getActiveSlide: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getActiveSlide, callback);
  assert.equal(receivedOptions.layerOrderRuntimeApi, undefined);
});

test('layer order shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const layerOrderRuntimeApi = {
    createStudioEditorLayerOrderRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorLayerOrderShellRuntime({
    layerOrderRuntimeApi,
    controllerApi: null,
    layerOrderApi: null,
    canonicalLayoutApi: null,
    canonicalDeckApi: null,
    layerOrderTransactionApi: null,
    layerOrderMutationApi: null,
    transactionApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.layerOrderApi, null);
  assert.equal(receivedOptions.canonicalLayoutApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.layerOrderTransactionApi, null);
  assert.equal(receivedOptions.layerOrderMutationApi, null);
  assert.equal(receivedOptions.transactionApi, null);
});

test('layer order shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorLayerOrderShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorLayerOrderShellRuntime({ layerOrderRuntimeApi: {} }),
    null
  );
});
