const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-clipboard-insertion-shell-composition.js');

test('clipboard insertion shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { insert() {} };
  const runtime = { insertionController: controller };
  const accessorsApi = {
    createStudioEditorClipboardInsertionRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const insertionRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    clipboardApi: { name: 'clipboard' },
    mutationApi: { name: 'mutation' },
    transactionApi: { name: 'transaction' },
    clipboardTransactionApi: { name: 'clipboard-transaction' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorClipboardInsertionShellComposition({
    accessorsApi,
    runtimeApi,
    insertionRuntimeApi,
    ...dependencies,
    runtimeOptions: { getIframeDoc }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.insertionRuntimeApi, insertionRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDoc, getIframeDoc);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('clipboard insertion shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorClipboardInsertionShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
