const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-block-shell-runtime.js');

test('block shell runtime resolves controller, canonical, render, and transaction dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'block-runtime' };
  const blockRuntimeApi = {
    createStudioEditorBlockRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalStateApi: { name: 'state' },
    renderApi: { name: 'render' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorBlockShellRuntime({
    blockRuntimeApi,
    ...dependencies,
    getCanonicalDeck: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getCanonicalDeck, callback);
  assert.equal(receivedOptions.blockRuntimeApi, undefined);
});

test('block shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const blockRuntimeApi = {
    createStudioEditorBlockRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorBlockShellRuntime({
    blockRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalStateApi: null,
    renderApi: null,
    transactionApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalStateApi, null);
  assert.equal(receivedOptions.renderApi, null);
  assert.equal(receivedOptions.transactionApi, null);
});

test('block shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorBlockShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorBlockShellRuntime({ blockRuntimeApi: {} }),
    null
  );
});
