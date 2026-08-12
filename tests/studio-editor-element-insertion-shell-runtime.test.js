const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-element-insertion-shell-runtime.js');

test('element insertion shell runtime resolves controller and canonical insertion dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'element-insertion-runtime' };
  const insertionRuntimeApi = {
    createStudioEditorElementInsertionRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalInsertionApi: { name: 'insertion' },
    deckImportApi: { name: 'import' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorElementInsertionShellRuntime({
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

test('element insertion shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const insertionRuntimeApi = {
    createStudioEditorElementInsertionRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorElementInsertionShellRuntime({
    insertionRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalInsertionApi: null,
    deckImportApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalInsertionApi, null);
  assert.equal(receivedOptions.deckImportApi, null);
});

test('element insertion shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorElementInsertionShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorElementInsertionShellRuntime({ insertionRuntimeApi: {} }),
    null
  );
});
