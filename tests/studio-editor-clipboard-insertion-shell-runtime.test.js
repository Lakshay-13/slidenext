const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-clipboard-insertion-shell-runtime.js');

test('clipboard insertion shell runtime resolves controller, mutation, and transaction dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'clipboard-insertion-runtime' };
  const insertionRuntimeApi = {
    createStudioEditorClipboardInsertionRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    clipboardApi: { name: 'clipboard' },
    mutationApi: { name: 'mutation' },
    transactionApi: { name: 'transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorClipboardInsertionShellRuntime({
    insertionRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.insertionRuntimeApi, undefined);
});

test('clipboard insertion shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const insertionRuntimeApi = {
    createStudioEditorClipboardInsertionRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorClipboardInsertionShellRuntime({
    insertionRuntimeApi,
    controllerApi: null,
    clipboardApi: null,
    mutationApi: null,
    transactionApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.clipboardApi, null);
  assert.equal(receivedOptions.mutationApi, null);
  assert.equal(receivedOptions.transactionApi, null);
});

test('clipboard insertion shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorClipboardInsertionShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorClipboardInsertionShellRuntime({ insertionRuntimeApi: {} }),
    null
  );
});
