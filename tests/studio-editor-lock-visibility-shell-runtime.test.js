const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-lock-visibility-shell-runtime.js');

test('lock visibility shell runtime resolves controller and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'lock-visibility-runtime' };
  const lockVisibilityRuntimeApi = {
    createStudioEditorLockVisibilityRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    lockStateApi: { name: 'lock-state' },
    visibilityStateApi: { name: 'visibility-state' },
    canonicalDeckApi: { name: 'deck' },
    canonicalVisibilityApi: { name: 'visibility' },
    canonicalStateApi: { name: 'state' },
    lockTransactionApi: { name: 'lock-transaction' },
    lockMutationApi: { name: 'lock-mutation' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorLockVisibilityShellRuntime({
    lockVisibilityRuntimeApi,
    ...dependencies,
    getSelectedElements: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getSelectedElements, callback);
  assert.equal(receivedOptions.lockVisibilityRuntimeApi, undefined);
});

test('lock visibility shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const lockVisibilityRuntimeApi = {
    createStudioEditorLockVisibilityRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorLockVisibilityShellRuntime({
    lockVisibilityRuntimeApi,
    controllerApi: null,
    lockStateApi: null,
    visibilityStateApi: null,
    canonicalDeckApi: null,
    canonicalVisibilityApi: null,
    canonicalStateApi: null,
    lockTransactionApi: null,
    lockMutationApi: null,
    transactionApi: null
  });

  for (const key of [
    'controllerApi',
    'lockStateApi',
    'visibilityStateApi',
    'canonicalDeckApi',
    'canonicalVisibilityApi',
    'canonicalStateApi',
    'lockTransactionApi',
    'lockMutationApi',
    'transactionApi'
  ]) {
    assert.equal(receivedOptions[key], null);
  }
});

test('lock visibility shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorLockVisibilityShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorLockVisibilityShellRuntime({ lockVisibilityRuntimeApi: {} }),
    null
  );
});
