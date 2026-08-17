const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-removal-state-shell-composition.js');

test('removal state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {} };
  const runtime = { isAvailable: true, removalStateController: controller };
  const accessorsApi = {
    createStudioEditorRemovalStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const removalStateApi = { name: 'state-api' };
  const removalView = { name: 'removal-view' };
  const getDocument = () => null;

  const result = composition.createStudioEditorRemovalStateShellComposition({
    accessorsApi,
    runtimeApi,
    removalStateApi,
    removalView,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.removalStateApi, removalStateApi);
  assert.equal(receivedOptions.runtimeOptions.removalView, removalView);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('removal state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorRemovalStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
