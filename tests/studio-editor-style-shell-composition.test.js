const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-style-shell-composition.js');

test('style shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { applyStyle() {} };
  const runtime = { styleController: controller };
  const accessorsApi = {
    createStudioEditorStyleAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const styleRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    styleApi: { name: 'style' },
    canonicalStyleApi: { name: 'canonical-style' },
    canonicalDeckApi: { name: 'canonical-deck' },
    transactionApi: { name: 'transaction' },
    styleTransactionApi: { name: 'style-transaction' },
    styleMutationApi: { name: 'style-mutation' },
    domApi: { name: 'dom' },
    chartApi: { name: 'chart' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorStyleShellComposition({
    accessorsApi,
    runtimeApi,
    styleRuntimeApi,
    ...dependencies,
    runtimeOptions: { getIframeDoc }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.styleRuntimeApi, styleRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDoc, getIframeDoc);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('style shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorStyleShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
