const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-removal-shell-runtime.js');

test('removal shell runtime resolves controller and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'removal-runtime' };
  const removalRuntimeApi = {
    createStudioEditorRemovalRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalRemovalApi: { name: 'removal' },
    removalTransactionApi: { name: 'removal-transaction' },
    removalMutationApi: { name: 'removal-mutation' },
    removalApi: { name: 'removal-api' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorRemovalShellRuntime({
    removalRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.removalRuntimeApi, undefined);
});

test('removal shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const removalRuntimeApi = {
    createStudioEditorRemovalRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorRemovalShellRuntime({
    removalRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalRemovalApi: null,
    removalTransactionApi: null,
    removalMutationApi: null,
    removalApi: null,
    transactionApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalRemovalApi, null);
  assert.equal(receivedOptions.removalTransactionApi, null);
  assert.equal(receivedOptions.removalMutationApi, null);
  assert.equal(receivedOptions.removalApi, null);
  assert.equal(receivedOptions.transactionApi, null);
});

test('removal shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorRemovalShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorRemovalShellRuntime({ removalRuntimeApi: {} }),
    null
  );
});
