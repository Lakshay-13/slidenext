const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-group-state-shell-composition.js');

test('group state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const runtime = { isAvailable: true, groupStateController: controller };
  const accessorsApi = {
    createStudioEditorGroupStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const groupStateApi = { name: 'group-state' };
  const groupApi = { name: 'group' };
  const getDocument = () => null;

  const result = composition.createStudioEditorGroupStateShellComposition({
    accessorsApi,
    runtimeApi,
    groupStateApi,
    groupApi,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.groupStateApi, groupStateApi);
  assert.equal(receivedOptions.runtimeOptions.groupApi, groupApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('group state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorGroupStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
