const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-clipboard-shell-runtime.js');
const clipboardRuntimeAccessors = require('../shared/studio-editor-clipboard-runtime-accessors.js');

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

test('clipboard runtime accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { clipboardController: { name: 'clipboard' } };
  const runtimeOptions = { getIframeDoc: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorClipboardShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const clipboardRuntimeApi = { name: 'runtime' };
  const accessors = clipboardRuntimeAccessors.createStudioEditorClipboardRuntimeAccessors({
    runtimeApi,
    clipboardRuntimeApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].clipboardRuntimeApi, clipboardRuntimeApi);
  assert.equal(calls[0].getIframeDoc, runtimeOptions.getIframeDoc);
  assert.notEqual(calls[0], runtimeOptions);
});

test('clipboard runtime accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = clipboardRuntimeAccessors.createStudioEditorClipboardRuntimeAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
