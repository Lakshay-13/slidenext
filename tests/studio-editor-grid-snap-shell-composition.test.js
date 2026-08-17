const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-grid-snap-shell-composition.js');

test('grid snap shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { toggle() {} };
  const runtime = { gridSnapController: controller };
  const accessorsApi = {
    createStudioEditorGridSnapRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const gridSnapRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    gridSnapView: { name: 'grid-snap-view' }
  };
  const documentRef = {};

  const result = composition.createStudioEditorGridSnapShellComposition({
    accessorsApi,
    runtimeApi,
    gridSnapRuntimeApi,
    ...dependencies,
    runtimeOptions: {
      documentRef,
      gridSizePx: 20
    }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.gridSnapRuntimeApi, gridSnapRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.documentRef, documentRef);
  assert.equal(receivedOptions.runtimeOptions.gridSizePx, 20);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('grid snap shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorGridSnapShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
