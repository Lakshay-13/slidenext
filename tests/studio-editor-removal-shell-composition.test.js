const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-removal-shell-composition.js');

test('removal shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { remove() {} };
  const runtime = { removalController: controller };
  const accessorsApi = {
    createStudioEditorRemovalAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const removalRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalRemovalApi: { name: 'canonical-removal' },
    removalTransactionApi: { name: 'removal-transaction' },
    removalMutationApi: { name: 'removal-mutation' },
    removalApi: { name: 'removal' },
    transactionApi: { name: 'transaction' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorRemovalShellComposition({
    accessorsApi,
    runtimeApi,
    removalRuntimeApi,
    ...dependencies,
    runtimeOptions: { getIframeDoc }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.removalRuntimeApi, removalRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDoc, getIframeDoc);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('removal shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorRemovalShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
