const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-clipboard-selection-shell-composition.js');

test('clipboard selection shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { build() {} };
  const runtime = { selectionController: controller };
  const accessorsApi = {
    createStudioEditorClipboardSelectionRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const selectionRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    clipboardApi: { name: 'clipboard' }
  };
  const getSelectedElements = () => [];

  const result = composition.createStudioEditorClipboardSelectionShellComposition({
    accessorsApi,
    runtimeApi,
    selectionRuntimeApi,
    ...dependencies,
    runtimeOptions: { getSelectedElements }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.selectionRuntimeApi, selectionRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getSelectedElements, getSelectedElements);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('clipboard selection shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorClipboardSelectionShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
