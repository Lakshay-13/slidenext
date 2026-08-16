const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-layout-shell-runtime.js');
const layoutAccessors = require('../shared/studio-editor-layout-accessors.js');

test('layout shell runtime resolves controller, engine, and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'layout-runtime' };
  const layoutRuntimeApi = {
    createStudioEditorLayoutRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    nudgeApi: { name: 'nudge-controller' },
    alignmentApi: { name: 'alignment-controller' },
    groupApi: { name: 'group-controller' },
    conversionApi: { name: 'conversion-controller' },
    layoutModeControllerApi: { name: 'layout-mode-controller' },
    nudgeEngineApi: { name: 'nudge' },
    conversionEngineApi: { name: 'conversion' },
    conversionMutationApi: { name: 'conversion-mutation' },
    alignmentEngineApi: { name: 'alignment' },
    positionLayoutTransactionApi: { name: 'position-transaction' },
    positionLayoutMutationApi: { name: 'position-mutation' },
    canonicalLayoutApi: { name: 'layout' },
    canonicalDeckApi: { name: 'deck' },
    canonicalGroupApi: { name: 'group' },
    deckImportApi: { name: 'import' },
    groupTransactionApi: { name: 'group-transaction' },
    ungroupTransactionApi: { name: 'ungroup-transaction' },
    groupMutationApi: { name: 'group-mutation' },
    ungroupMutationApi: { name: 'ungroup-mutation' },
    groupEngineApi: { name: 'group-engine' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorLayoutShellRuntime({
    layoutRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.layoutRuntimeApi, undefined);
});

test('layout shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const layoutRuntimeApi = {
    createStudioEditorLayoutRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorLayoutShellRuntime({
    layoutRuntimeApi,
    nudgeApi: null,
    alignmentApi: null,
    groupApi: null,
    conversionApi: null,
    layoutModeControllerApi: null,
    nudgeEngineApi: null,
    conversionEngineApi: null,
    conversionMutationApi: null,
    alignmentEngineApi: null,
    positionLayoutTransactionApi: null,
    positionLayoutMutationApi: null,
    canonicalLayoutApi: null,
    canonicalDeckApi: null,
    canonicalGroupApi: null,
    deckImportApi: null,
    groupTransactionApi: null,
    ungroupTransactionApi: null,
    groupMutationApi: null,
    ungroupMutationApi: null,
    groupEngineApi: null,
    transactionApi: null
  });

  for (const key of [
    'nudgeApi',
    'alignmentApi',
    'groupApi',
    'conversionApi',
    'layoutModeControllerApi',
    'nudgeEngineApi',
    'conversionEngineApi',
    'conversionMutationApi',
    'alignmentEngineApi',
    'positionLayoutTransactionApi',
    'positionLayoutMutationApi',
    'canonicalLayoutApi',
    'canonicalDeckApi',
    'canonicalGroupApi',
    'deckImportApi',
    'groupTransactionApi',
    'ungroupTransactionApi',
    'groupMutationApi',
    'ungroupMutationApi',
    'groupEngineApi',
    'transactionApi'
  ]) {
    assert.equal(receivedOptions[key], null);
  }
});

test('layout shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorLayoutShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorLayoutShellRuntime({ layoutRuntimeApi: {} }),
    null
  );
});

test('layout accessors compose the shell runtime and preserve its dependencies', () => {
  const runtime = { layoutController: { name: 'layout' } };
  const runtimeOptions = { documentRef: {} };
  const calls = [];
  const runtimeApi = {
    createStudioEditorLayoutShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const layoutRuntimeApi = { name: 'runtime' };
  const accessors = layoutAccessors.createStudioEditorLayoutAccessors({
    runtimeApi,
    layoutRuntimeApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].layoutRuntimeApi, layoutRuntimeApi);
  assert.equal(calls[0].documentRef, runtimeOptions.documentRef);
  assert.notEqual(calls[0], runtimeOptions);
});

test('layout accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = layoutAccessors.createStudioEditorLayoutAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
