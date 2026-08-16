const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-lock-visibility-shell-runtime.js');
const lockVisibilityAccessors = require('../shared/studio-editor-lock-visibility-accessors.js');

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
    visibilityTransactionApi: { name: 'visibility-transaction' },
    visibilityMutationApi: { name: 'visibility-mutation' },
    elementStateApi: { name: 'element-state' },
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
    visibilityTransactionApi: null,
    visibilityMutationApi: null,
    elementStateApi: null,
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
    'visibilityTransactionApi',
    'visibilityMutationApi',
    'elementStateApi',
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

test('lock visibility accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { lockVisibilityController: { name: 'lock-visibility' } };
  const runtimeOptions = { getSelectedElements: () => [] };
  const calls = [];
  const runtimeApi = {
    createStudioEditorLockVisibilityShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const lockVisibilityRuntimeApi = { name: 'runtime' };
  const accessors = lockVisibilityAccessors.createStudioEditorLockVisibilityAccessors({
    runtimeApi,
    lockVisibilityRuntimeApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].lockVisibilityRuntimeApi, lockVisibilityRuntimeApi);
  assert.equal(calls[0].getSelectedElements, runtimeOptions.getSelectedElements);
  assert.notEqual(calls[0], runtimeOptions);
});

test('lock visibility accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = lockVisibilityAccessors.createStudioEditorLockVisibilityAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
