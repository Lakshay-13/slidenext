const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-transform-shell-composition.js');

test('transform shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { startDrag() {} };
  const runtime = { transformController: controller };
  const accessorsApi = {
    createStudioEditorTransformRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const transformRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    transformApi: { name: 'transform' },
    canonicalTransformApi: { name: 'canonical-transform' },
    canonicalDeckApi: { name: 'canonical-deck' },
    transactionApi: { name: 'transaction' },
    domApi: { name: 'dom' },
    interactionOptionsApi: { name: 'interaction-options' },
    interactionsApi: { name: 'interactions' },
    eventsApi: { name: 'events' },
    selectionBoundsApi: { name: 'selection-bounds' }
  };
  const getActiveSlide = () => null;

  const result = composition.createStudioEditorTransformShellComposition({
    accessorsApi,
    runtimeApi,
    transformRuntimeApi,
    ...dependencies,
    runtimeOptions: {
      getActiveSlide,
      dragStartThresholdPx: 4
    }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.transformRuntimeApi, transformRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getActiveSlide, getActiveSlide);
  assert.equal(receivedOptions.runtimeOptions.dragStartThresholdPx, 4);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('transform shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorTransformShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
