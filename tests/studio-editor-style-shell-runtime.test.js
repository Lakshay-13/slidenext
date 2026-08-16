const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-style-shell-runtime.js');
const styleAccessors = require('../shared/studio-editor-style-accessors.js');

test('style shell runtime resolves controller, chart, canonical, and DOM dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'style-runtime' };
  const styleRuntimeApi = {
    createStudioEditorStyleRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    styleApi: { name: 'style' },
    canonicalStyleApi: { name: 'canonical-style' },
    canonicalDeckApi: { name: 'deck' },
    transactionApi: { name: 'transaction' },
    styleTransactionApi: { name: 'style-transaction' },
    styleMutationApi: { name: 'style-mutation' },
    domApi: { name: 'dom' },
    chartApi: { name: 'chart' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorStyleShellRuntime({
    styleRuntimeApi,
    ...dependencies,
    getSelectedElements: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getSelectedElements, callback);
  assert.equal(receivedOptions.styleRuntimeApi, undefined);
});

test('style shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const styleRuntimeApi = {
    createStudioEditorStyleRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorStyleShellRuntime({
    styleRuntimeApi,
    controllerApi: null,
    styleApi: null,
    canonicalStyleApi: null,
    canonicalDeckApi: null,
    transactionApi: null,
    styleTransactionApi: null,
    styleMutationApi: null,
    domApi: null,
    chartApi: null
  });

  for (const key of [
    'controllerApi',
    'styleApi',
    'canonicalStyleApi',
    'canonicalDeckApi',
    'transactionApi',
    'styleTransactionApi',
    'styleMutationApi',
    'domApi',
    'chartApi'
  ]) {
    assert.equal(receivedOptions[key], null);
  }
});

test('style shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorStyleShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorStyleShellRuntime({ styleRuntimeApi: {} }),
    null
  );
});

test('style accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { styleController: { name: 'style' } };
  const runtimeOptions = { getIframeDoc: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorStyleShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const styleRuntimeApi = { name: 'runtime' };
  const accessors = styleAccessors.createStudioEditorStyleAccessors({
    runtimeApi,
    styleRuntimeApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].styleRuntimeApi, styleRuntimeApi);
  assert.equal(calls[0].getIframeDoc, runtimeOptions.getIframeDoc);
  assert.notEqual(calls[0], runtimeOptions);
});

test('style accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = styleAccessors.createStudioEditorStyleAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
