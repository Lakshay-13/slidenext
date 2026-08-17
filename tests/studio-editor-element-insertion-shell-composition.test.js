const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-element-insertion-shell-composition.js');

test('element insertion shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { insertText() {} };
  const runtime = { elementInsertionController: controller };
  const accessorsApi = {
    createStudioEditorElementInsertionRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const insertionRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalInsertionApi: { name: 'canonical-insertion' },
    deckImportApi: { name: 'deck-import' },
    insertionTransactionApi: { name: 'insertion-transaction' },
    elementInsertionMutationApi: { name: 'element-insertion-mutation' },
    insertionApi: { name: 'insertion' },
    transactionApi: { name: 'transaction' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorElementInsertionShellComposition({
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

test('element insertion shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorElementInsertionShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
