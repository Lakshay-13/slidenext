const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-ungroup-state-shell-composition.js');

test('ungroup state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const runtime = { isAvailable: true, ungroupStateController: controller };
  const accessorsApi = {
    createStudioEditorUngroupStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const ungroupStateApi = { name: 'ungroup-state' };
  const groupApi = { name: 'group' };
  const getDocument = () => null;

  const result = composition.createStudioEditorUngroupStateShellComposition({
    accessorsApi,
    runtimeApi,
    ungroupStateApi,
    groupApi,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.ungroupStateApi, ungroupStateApi);
  assert.equal(receivedOptions.runtimeOptions.groupApi, groupApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('ungroup state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorUngroupStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
