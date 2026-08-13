const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-layout-shell-runtime.js');

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
    alignmentEngineApi: { name: 'alignment' },
    canonicalLayoutApi: { name: 'layout' },
    canonicalDeckApi: { name: 'deck' },
    canonicalGroupApi: { name: 'group' },
    deckImportApi: { name: 'import' },
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
    alignmentEngineApi: null,
    canonicalLayoutApi: null,
    canonicalDeckApi: null,
    canonicalGroupApi: null,
    deckImportApi: null,
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
    'alignmentEngineApi',
    'canonicalLayoutApi',
    'canonicalDeckApi',
    'canonicalGroupApi',
    'deckImportApi',
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
