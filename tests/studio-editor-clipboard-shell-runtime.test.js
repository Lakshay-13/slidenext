const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-clipboard-shell-runtime.js');

test('clipboard shell runtime resolves clipboard and canonical insertion dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'clipboard-runtime' };
  const clipboardRuntimeApi = {
    createStudioEditorClipboardRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    clipboardApi: { name: 'clipboard' },
    canonicalDeckApi: { name: 'deck' },
    canonicalInsertionApi: { name: 'insertion' },
    deckImportApi: { name: 'import' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorClipboardShellRuntime({
    clipboardRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.clipboardRuntimeApi, undefined);
});

test('clipboard shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const clipboardRuntimeApi = {
    createStudioEditorClipboardRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorClipboardShellRuntime({
    clipboardRuntimeApi,
    controllerApi: null,
    clipboardApi: null,
    canonicalDeckApi: null,
    canonicalInsertionApi: null,
    deckImportApi: null
  });

  for (const key of [
    'controllerApi',
    'clipboardApi',
    'canonicalDeckApi',
    'canonicalInsertionApi',
    'deckImportApi'
  ]) {
    assert.equal(receivedOptions[key], null);
  }
});

test('clipboard shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorClipboardShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorClipboardShellRuntime({ clipboardRuntimeApi: {} }),
    null
  );
});
