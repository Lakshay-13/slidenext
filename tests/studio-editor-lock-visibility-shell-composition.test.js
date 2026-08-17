const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-lock-visibility-shell-composition.js');

test('lock visibility shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { name: 'lock-visibility-controller' };
  const runtime = { lockVisibilityController: controller };
  const accessorsApi = {
    createStudioEditorLockVisibilityAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const lockVisibilityRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    lockStateApi: { name: 'lock-state' },
    visibilityStateApi: { name: 'visibility-state' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalVisibilityApi: { name: 'canonical-visibility' },
    canonicalStateApi: { name: 'canonical-state' },
    lockTransactionApi: { name: 'lock-transaction' },
    lockMutationApi: { name: 'lock-mutation' },
    visibilityTransactionApi: { name: 'visibility-transaction' },
    visibilityMutationApi: { name: 'visibility-mutation' },
    elementStateApi: { name: 'element-state' },
    transactionApi: { name: 'transaction' }
  };
  const getSelectedElements = () => [];

  const result = composition.createStudioEditorLockVisibilityShellComposition({
    accessorsApi,
    runtimeApi,
    lockVisibilityRuntimeApi,
    ...dependencies,
    runtimeOptions: { getSelectedElements }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.lockVisibilityRuntimeApi, lockVisibilityRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getSelectedElements, getSelectedElements);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('lock visibility shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLockVisibilityShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
